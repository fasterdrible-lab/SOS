import { getAccessLevel, hasPermission, opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import {
  averageTicket,
  computeGoalProgress,
  conversionRate,
  type GoalProgress,
} from "@/lib/meu-dia/goal-progress"
import { getUnseenQualifiedLeadsCount } from "@/lib/sdr/notifications"
import {
  businessDaysOfMonth,
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
  }
}
