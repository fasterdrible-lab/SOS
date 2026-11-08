import type { ActivityType } from "@/lib/activities/rules"
import { getAccessLevel, hasPermission, opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import {
  averageTicket,
  computeGoalProgress,
  conversionRate,
  type GoalProgress,
} from "@/lib/meu-dia/goal-progress"
import { saleiaMeetingScope } from "@/lib/saleia/service"
import { getUnseenQualifiedLeadsCount } from "@/lib/sdr/notifications"
import { dayKey } from "@/lib/dashboard/period"
import {
  businessDaysOfMonth,
  calendarDateIn,
  dayRange,
  monthKey,
  monthRange,
} from "@/lib/time/business-calendar"
import { ORGANIZATION_GOAL_SCOPE } from "@/lib/validations/goal"

/** Sem movimentacao ha mais que isso, a negociacao esta esfriando. Configuravel na V2-9. */
export const COOLING_AFTER_DAYS = 14
const LIST_LIMIT = 5
const DAY_MS = 24 * 60 * 60 * 1000


export interface OpportunityItem {
  id: string
  title: string
  value: number
  stageName: string
  companyName: string | null
  daysInStage: number
  expectedClose: string | null
}

export interface TaskItem {
  id: string
  title: string
  dueDate: string
  planId: string
  planTitle: string
  overdue: boolean
}

export interface ActivitySummaryItem {
  id: string
  type: ActivityType
  title: string
  dueDate: string
  companyName: string | null
  overdue: boolean
}

export interface OpportunityList {
  total: number
  items: OpportunityItem[]
}

export interface MyDaySummary {
  scope: "OWN" | "ORGANIZATION"
  month: string
  goal: GoalProgress
  wonCount: number
  lostCount: number
  conversionRate: number | null
  averageTicket: number | null
  salesToday: { count: number; revenue: number }
  proposals: OpportunityList
  cooling: OpportunityList
  overdueClose: OpportunityList
  tasks: { overdue: number; today: number; items: TaskItem[] }
  /** Nulo quando o papel nao acompanha o IA SDR. */
  hotLeads: number | null
  meetingsToday: { total: number; items: ActivitySummaryItem[] }
  followUps: { overdue: number; today: number; items: ActivitySummaryItem[] }
  /** Recomendacoes e etapas sugeridas do SALEIA esperando decisao; nulo sem `saleia:read`. */
  saleia: { total: number; items: SaleiaPendingItem[] } | null
  /** Quando o proprio dia de hoje foi fechado no Report (ISO), ou nulo. */
  dayClosedAt: string | null
}

export interface SaleiaPendingItem {
  id: string
  kind: "RECOMMENDATION" | "STAGE_SUGGESTION"
  text: string
  stageName: string | null
  dueDate: string | null
  meetingId: string
  meetingTitle: string
  meetingStartedAt: string
  companyName: string | null
}

const opportunitySelect = {
  id: true,
  title: true,
  value: true,
  stage: { select: { name: true } },
  stageChangedAt: true,
  expectedClose: true,
  company: { select: { name: true } },
} as const

type OpportunityRow = {
  id: string
  title: string
  value: { toString(): string }
  stage: { name: string }
  stageChangedAt: Date
  expectedClose: Date | null
  company: { name: string } | null
}

function toItem(row: OpportunityRow, now: Date): OpportunityItem {
  return {
    id: row.id,
    title: row.title,
    value: Number(row.value),
    stageName: row.stage.name,
    companyName: row.company?.name ?? null,
    daysInStage: Math.max(0, Math.floor((now.getTime() - row.stageChangedAt.getTime()) / DAY_MS)),
    expectedClose: row.expectedClose?.toISOString() ?? null,
  }
}

export async function getMyDaySummary(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  now?: Date
}): Promise<MyDaySummary> {
  const { organizationId, userId, role } = input
  const now = input.now ?? new Date()
  const isSeller = getAccessLevel(role) === "SELLER"
  const month = monthKey(now)
  const monthWindow = monthRange(now)
  const today = dayRange(now)
  const coolingBefore = new Date(now.getTime() - COOLING_AFTER_DAYS * DAY_MS)

  const scoped = { organizationId, ...opportunityScope(role, userId) }
  const open = { ...scoped, status: "OPEN" as const }
  const proposalsWhere = { ...open, stage: { isProposal: true } }
  const coolingWhere = { ...open, stageChangedAt: { lt: coolingBefore } }
  const overdueWhere = { ...open, expectedClose: { lt: today.start } }
  const taskWhere = {
    actionPlan: { organizationId },
    status: { in: ["PENDING" as const, "IN_PROGRESS" as const] },
    dueDate: { lt: today.end },
  }
  const pendingActivity = { organizationId, ...opportunityScope(role, userId), completedAt: null }
  const meetingWhere = {
    ...pendingActivity,
    type: "MEETING" as const,
    dueDate: { gte: today.start, lt: today.end },
  }
  const followUpWhere = {
    ...pendingActivity,
    type: { notIn: ["MEETING" as const, "NOTE" as const] },
    dueDate: { lt: today.end },
  }
  const canSeeSaleia = hasPermission(role, "saleia:read")
  const saleiaWhere = {
    organizationId,
    status: "OPEN" as const,
    kind: { in: ["RECOMMENDATION" as const, "STAGE_SUGGESTION" as const] },
    meeting: saleiaMeetingScope(role, userId),
  }
  const activitySelect = {
    id: true,
    type: true,
    title: true,
    dueDate: true,
    company: { select: { name: true } },
  } as const
  const toActivity = (row: {
    id: string
    type: ActivityType
    title: string
    dueDate: Date | null
    company: { name: string } | null
  }): ActivitySummaryItem => ({
    id: row.id,
    type: row.type,
    title: row.title,
    dueDate: row.dueDate!.toISOString(),
    companyName: row.company?.name ?? null,
    overdue: row.dueDate! < today.start,
  })

  const [
    goal,
    wonMonth,
    lostMonth,
    wonToday,
    proposals,
    proposalsTotal,
    cooling,
    coolingTotal,
    overdueClose,
    overdueCloseTotal,
    tasks,
    tasksOverdue,
    tasksTotal,
    hotLeads,
    meetings,
    meetingsTotal,
    followUps,
    followUpsOverdue,
    followUpsTotal,
    saleiaItems,
    saleiaTotal,
    dayReport,
  ] = await Promise.all([
    prisma.salesGoal.findUnique({
      where: {
        organizationId_month_scopeKey: {
          organizationId,
          month,
          scopeKey: isSeller ? userId : ORGANIZATION_GOAL_SCOPE,
        },
      },
      select: { amount: true },
    }),
    prisma.opportunity.aggregate({
      where: { ...scoped, status: "WON", wonAt: { gte: monthWindow.start, lt: monthWindow.end } },
      _sum: { value: true },
      _count: true,
    }),
    prisma.opportunity.count({
      where: { ...scoped, status: "LOST", lostAt: { gte: monthWindow.start, lt: monthWindow.end } },
    }),
    prisma.opportunity.aggregate({
      where: { ...scoped, status: "WON", wonAt: { gte: today.start, lt: today.end } },
      _sum: { value: true },
      _count: true,
    }),
    prisma.opportunity.findMany({
      where: proposalsWhere,
      select: opportunitySelect,
      orderBy: { stageChangedAt: "asc" },
      take: LIST_LIMIT,
    }),
    prisma.opportunity.count({ where: proposalsWhere }),
    prisma.opportunity.findMany({
      where: coolingWhere,
      select: opportunitySelect,
      orderBy: { stageChangedAt: "asc" },
      take: LIST_LIMIT,
    }),
    prisma.opportunity.count({ where: coolingWhere }),
    prisma.opportunity.findMany({
      where: overdueWhere,
      select: opportunitySelect,
      orderBy: { expectedClose: "asc" },
      take: LIST_LIMIT,
    }),
    prisma.opportunity.count({ where: overdueWhere }),
    prisma.actionTask.findMany({
      where: taskWhere,
      select: {
        id: true,
        title: true,
        dueDate: true,
        actionPlan: { select: { id: true, title: true } },
      },
      orderBy: { dueDate: "asc" },
      take: LIST_LIMIT,
    }),
    prisma.actionTask.count({ where: { ...taskWhere, dueDate: { lt: today.start } } }),
    prisma.actionTask.count({ where: taskWhere }),
    hasPermission(role, "sdr:read") ? getUnseenQualifiedLeadsCount(organizationId) : null,
    prisma.activity.findMany({
      where: meetingWhere,
      select: activitySelect,
      orderBy: { dueDate: "asc" },
      take: LIST_LIMIT,
    }),
    prisma.activity.count({ where: meetingWhere }),
    prisma.activity.findMany({
      where: followUpWhere,
      select: activitySelect,
      orderBy: { dueDate: "asc" },
      take: LIST_LIMIT,
    }),
    prisma.activity.count({ where: { ...followUpWhere, dueDate: { lt: today.start } } }),
    prisma.activity.count({ where: followUpWhere }),
    canSeeSaleia
      ? prisma.saleiaInsight.findMany({
          where: saleiaWhere,
          select: {
            id: true,
            kind: true,
            text: true,
            stageName: true,
            dueDate: true,
            meeting: { select: { id: true, title: true, startedAt: true, company: { select: { name: true } } } },
          },
          orderBy: [{ meeting: { startedAt: "desc" } }, { position: "asc" }],
          take: LIST_LIMIT,
        })
      : [],
    canSeeSaleia ? prisma.saleiaInsight.count({ where: saleiaWhere }) : 0,
    prisma.dailyReport.findUnique({
      where: { organizationId_userId_day: { organizationId, userId, day: dayKey(calendarDateIn(now)) } },
      select: { closedAt: true },
    }),
  ])

  const revenue = Number(wonMonth._sum.value ?? 0)

  return {
    scope: isSeller ? "OWN" : "ORGANIZATION",
    month,
    goal: computeGoalProgress({
      goal: goal ? Number(goal.amount) : null,
      revenue,
      businessDays: businessDaysOfMonth(now),
    }),
    wonCount: wonMonth._count,
    lostCount: lostMonth,
    conversionRate: conversionRate(wonMonth._count, lostMonth),
    averageTicket: averageTicket(revenue, wonMonth._count),
    salesToday: { count: wonToday._count, revenue: Number(wonToday._sum.value ?? 0) },
    proposals: { total: proposalsTotal, items: proposals.map((row) => toItem(row, now)) },
    cooling: { total: coolingTotal, items: cooling.map((row) => toItem(row, now)) },
    overdueClose: { total: overdueCloseTotal, items: overdueClose.map((row) => toItem(row, now)) },
    tasks: {
      overdue: tasksOverdue,
      today: tasksTotal - tasksOverdue,
      items: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate!.toISOString(),
        planId: task.actionPlan.id,
        planTitle: task.actionPlan.title,
        overdue: task.dueDate! < today.start,
      })),
    },
    hotLeads,
    meetingsToday: { total: meetingsTotal, items: meetings.map(toActivity) },
    followUps: {
      overdue: followUpsOverdue,
      today: followUpsTotal - followUpsOverdue,
      items: followUps.map(toActivity),
    },
    saleia: canSeeSaleia
      ? {
          total: saleiaTotal,
          items: saleiaItems.map((insight) => ({
            id: insight.id,
            kind: insight.kind as SaleiaPendingItem["kind"],
            text: insight.text,
            stageName: insight.stageName,
            dueDate: insight.dueDate?.toISOString() ?? null,
            meetingId: insight.meeting.id,
            meetingTitle: insight.meeting.title,
            meetingStartedAt: insight.meeting.startedAt.toISOString(),
            companyName: insight.meeting.company?.name ?? null,
          })),
        }
      : null,
    dayClosedAt: dayReport?.closedAt.toISOString() ?? null,
  }
}
