import { getAccessLevel, isTeamManager, opportunityScope } from "@/lib/authz/permissions"
import {
  averageCycleDays,
  buildFunnel,
  buildTeamRows,
  rankGroups,
  type FunnelStep,
  type RankedGroups,
  type TeamRow,
} from "@/lib/dashboard/metrics"
import {
  dayKey,
  eachDay,
  percentChange,
  periodWindow,
  type DayRange,
  type PeriodKey,
} from "@/lib/dashboard/period"
import { prisma } from "@/lib/db"
import { computeGoalProgress, type GoalProgress } from "@/lib/meu-dia/goal-progress"
import { COOLING_AFTER_DAYS } from "@/lib/meu-dia/summary"
import type { PipelineSummary } from "@/lib/pipelines/service"
import {
  businessDaysOfMonth,
  calendarDateIn,
  monthKey,
  monthRange,
  startOfCalendarDate,
  type Range,
} from "@/lib/time/business-calendar"
import { ORGANIZATION_GOAL_SCOPE } from "@/lib/validations/goal"

const DAY_MS = 24 * 60 * 60 * 1000
const round1 = (value: number) => Math.round(value * 10) / 10

export interface Comparison {
  value: number
  previous: number
  /** Variacao percentual; nula sem base. */
  change: number | null
}

export interface GoalRow {
  userId: string | null
  name: string
  progress: GoalProgress
}

export interface ExecutiveDashboard {
  period: { key: PeriodKey; label: string; start: string; end: string }
  /** OWN: vendedor; SELLER: gestor filtrando um vendedor; ORGANIZATION: todos. */
  scope: "OWN" | "SELLER" | "ORGANIZATION"
  sellerId: string | null
  revenue: Comparison & { daily: number[] }
  wonCount: Comparison
  averageTicket: { value: number | null; previous: number | null; change: number | null }
  winRate: {
    value: number | null
    previous: number | null
    /** Diferenca em pontos percentuais. */
    changePp: number | null
    lost: number
  }
  /** Sempre o mes corrente, independente do filtro de periodo. */
  pace: {
    month: string
    revenue: number
    projection: number | null
    goal: number | null
    averageLast3Months: number
    changeVsAverage: number | null
    businessDays: { total: number; elapsed: number }
  }
  /** Funil filtrado; nulo = todos. */
  pipelineId: string | null
  /** Funil filtrado ou, com todos, o padrao: etapas diferem entre funis. */
  funnel: { pipelineId: string; pipelineName: string; leads: number | null; steps: FunnelStep[] }
  health: {
    openCount: number
    openValue: number
    cooling: number
    overdueClose: number
    salesCycleDays: number | null
  }
  goals: { month: string; rows: GoalRow[] }
  /** Nulo para o vendedor. */
  team: TeamRow[] | null
  origins: RankedGroups
  lossReasons: RankedGroups
}

export interface DashboardMember {
  userId: string
  name: string
}

/** Com `teamId`, so as pessoas dessa equipe (gestor com equipe, V2-9.2). */
export async function getDashboardMembers(organizationId: string, teamId?: string): Promise<DashboardMember[]> {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId, ...(teamId ? { teamId } : {}) },
    select: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  })
  return members.map(({ user }) => ({ userId: user.id, name: user.name || user.email }))
}

/**
 * Filtro de vendedor pedido na URL: so gestor e administrador filtram, e apenas
 * por membros da organizacao. `invalid` indica um id que nao pertence a ela.
 */
export function resolveSellerFilter(
  role: string | null | undefined,
  members: DashboardMember[],
  requested: string | null | undefined
): { sellerId: string | null; invalid: boolean } {
  if (!requested || getAccessLevel(role) === "SELLER") return { sellerId: null, invalid: false }
  const valid = members.some((member) => member.userId === requested)
  return { sellerId: valid ? requested : null, invalid: !valid }
}

function toRange(range: DayRange): Range {
  return { start: startOfCalendarDate(range.start), end: startOfCalendarDate(range.end) }
}

const between = (range: Range) => ({ gte: range.start, lt: range.end })

export async function getExecutiveDashboard(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  /** Equipe de quem consulta; restringe o gestor com equipe (V2-9.2). */
  teamId: string | null
  period: PeriodKey
  /** Ja validado como membro da organizacao. Ignorado para o vendedor. */
  sellerId?: string | null
  /** Evita reconsultar quando quem chama ja tem a lista. */
  members?: DashboardMember[]
  /** Funis ativos da organizacao (getPipelines), o padrao primeiro. */
  pipelines: PipelineSummary[]
  /** Ja validado como funil da organizacao; nulo = todos. */
  pipelineId?: string | null
  now?: Date
}): Promise<ExecutiveDashboard> {
  const { organizationId, userId, role, period, pipelines } = input
  const pipelineId = input.pipelineId ?? null
  const funnelPipeline = pipelines.find((pipeline) => pipeline.id === pipelineId) ?? pipelines[0]
  const now = input.now ?? new Date()
  const level = getAccessLevel(role)
  const isSeller = level === "SELLER"

  const ownerId = isSeller ? userId : (input.sellerId ?? null)
  const scope = isSeller ? "OWN" : ownerId ? "SELLER" : "ORGANIZATION"
  const teamManager = isTeamManager(role, input.teamId)
  // Sem vendedor escolhido vale o escopo do papel: tudo, a equipe do gestor
  // com equipe (e o que esta sem dono) ou nada para papel desconhecido.
  const owner = level !== null && ownerId ? { ownerId } : opportunityScope(role, userId, input.teamId)
  const base = { organizationId, ...owner, ...(pipelineId ? { pipelineId } : {}) }

  const window = periodWindow(period, calendarDateIn(now))
  const current = toRange(window.current)
  const previous = toRange(window.previous)
  const month = monthRange(now)
  const monthId = monthKey(now)
  // 80 dias antes do dia 1 cai sempre no terceiro mes anterior (2 meses < 63 dias < 80 < 89).
  const threeMonthsAgo = monthRange(new Date(month.start.getTime() - 80 * DAY_MS)).start
  const today = startOfCalendarDate(calendarDateIn(now))
  const open = { ...base, status: "OPEN" as const }

  const [
    wonCurrent,
    wonPrevious,
    lostCurrent,
    lostPrevious,
    stageEntries,
    leads,
    openTotals,
    cooling,
    overdueClose,
    monthByOwner,
    lastThreeMonths,
    goals,
    members,
  ] = await Promise.all([
    prisma.opportunity.findMany({
      where: { ...base, status: "WON", wonAt: between(current) },
      select: { value: true, wonAt: true, createdAt: true, ownerId: true, lead: { select: { source: true } } },
    }),
    prisma.opportunity.aggregate({
      where: { ...base, status: "WON", wonAt: between(previous) },
      _sum: { value: true },
      _count: true,
    }),
    prisma.opportunity.findMany({
      where: { ...base, status: "LOST", lostAt: between(current) },
      select: { value: true, ownerId: true, lostReason: true },
    }),
    prisma.opportunity.count({ where: { ...base, status: "LOST", lostAt: between(previous) } }),
    prisma.opportunityStageHistory.findMany({
      where: {
        organizationId,
        changedAt: between(current),
        opportunity: owner,
        toStage: { pipelineId: funnelPipeline.id },
      },
      select: { opportunityId: true, toStageId: true, toStatus: true },
    }),
    // Leads nao tem dono nem funil: so entram na visao da organizacao inteira.
    scope === "ORGANIZATION" && !pipelineId && !teamManager
      ? prisma.lead.count({ where: { organizationId, createdAt: between(current) } })
      : null,
    prisma.opportunity.aggregate({ where: open, _sum: { value: true }, _count: true }),
    prisma.opportunity.count({
      where: { ...open, stageChangedAt: { lt: new Date(now.getTime() - COOLING_AFTER_DAYS * DAY_MS) } },
    }),
    prisma.opportunity.count({ where: { ...open, expectedClose: { lt: today } } }),
    prisma.opportunity.groupBy({
      by: ["ownerId"],
      where: { ...base, status: "WON", wonAt: between(month) },
      _sum: { value: true },
    }),
    prisma.opportunity.aggregate({
      where: { ...base, status: "WON", wonAt: { gte: threeMonthsAgo, lt: month.start } },
      _sum: { value: true },
    }),
    prisma.salesGoal.findMany({
      where: { organizationId, month: monthId },
      select: { scopeKey: true, amount: true },
    }),
    input.members ?? getDashboardMembers(organizationId, teamManager ? (input.teamId as string) : undefined),
  ])

  const sales = wonCurrent.map((sale) => ({
    ownerId: sale.ownerId,
    value: Number(sale.value),
    wonAt: sale.wonAt!,
    createdAt: sale.createdAt,
    source: sale.lead?.source ?? null,
  }))
  const revenue = round2(sales.reduce((sum, sale) => sum + sale.value, 0))
  const previousRevenue = Number(wonPrevious._sum.value ?? 0)
  const previousWon = wonPrevious._count
  const ticket = sales.length === 0 ? null : round2(revenue / sales.length)
  const previousTicket = previousWon === 0 ? null : round2(previousRevenue / previousWon)
  const winRate = rate(sales.length, lostCurrent.length)
  const previousWinRate = rate(previousWon, lostPrevious)

  const dailyTotals = new Map<string, number>()
  for (const sale of sales) {
    const key = dayKey(calendarDateIn(sale.wonAt))
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + sale.value)
  }

  const monthRevenue = new Map(
    monthByOwner
      .filter((row) => row.ownerId !== null)
      .map((row) => [row.ownerId as string, Number(row._sum.value ?? 0)])
  )
  const monthTotal = monthByOwner.reduce((sum, row) => sum + Number(row._sum.value ?? 0), 0)
  const goalByScope = new Map(goals.map((goal) => [goal.scopeKey, Number(goal.amount)]))
  const businessDays = businessDaysOfMonth(now)
  const goalOf = (scopeKey: string) => goalByScope.get(scopeKey) ?? null
  // Nao ha meta por equipe: o gestor com equipe ve as metas individuais dela.
  const paceGoal = !ownerId && teamManager ? null : goalOf(ownerId ?? ORGANIZATION_GOAL_SCOPE)
  const paceProgress = computeGoalProgress({ goal: paceGoal, revenue: monthTotal, businessDays })
  const averageLast3Months = round2(Number(lastThreeMonths._sum.value ?? 0) / 3)

  const nameOf = (id: string) => members.find((member) => member.userId === id)?.name ?? "Ex-membro"
  const sellerGoals = new Map(
    [...goalByScope].filter(
      ([scopeKey]) =>
        scopeKey !== ORGANIZATION_GOAL_SCOPE &&
        (!teamManager || members.some((member) => member.userId === scopeKey))
    )
  )
  const goalRows: GoalRow[] = ownerId
    ? [{ userId: ownerId, name: nameOf(ownerId), progress: paceProgress }]
    : [
        ...(paceGoal !== null
          ? [{ userId: null, name: "Equipe", progress: paceProgress }]
          : []),
        ...[...sellerGoals].map(([sellerId, goal]) => ({
          userId: sellerId,
          name: nameOf(sellerId),
          progress: computeGoalProgress({ goal, revenue: monthRevenue.get(sellerId) ?? 0, businessDays }),
        })),
      ]

  return {
    period: {
      key: window.key,
      label: window.label,
      start: dayKey(window.current.start),
      end: dayKey(calendarDateIn(new Date(current.end.getTime() - 1))),
    },
    scope,
    sellerId: ownerId,
    revenue: {
      value: revenue,
      previous: previousRevenue,
      change: percentChange(revenue, previousRevenue),
      daily: eachDay(window.current).map((day) => round2(dailyTotals.get(dayKey(day)) ?? 0)),
    },
    wonCount: { value: sales.length, previous: previousWon, change: percentChange(sales.length, previousWon) },
    averageTicket: {
      value: ticket,
      previous: previousTicket,
      change: ticket !== null && previousTicket !== null ? percentChange(ticket, previousTicket) : null,
    },
    winRate: {
      value: winRate,
      previous: previousWinRate,
      changePp: winRate !== null && previousWinRate !== null ? round1(winRate - previousWinRate) : null,
      lost: lostCurrent.length,
    },
    pace: {
      month: monthId,
      revenue: round2(monthTotal),
      projection: paceProgress.projection,
      goal: paceGoal,
      averageLast3Months,
      changeVsAverage:
        paceProgress.projection === null ? null : percentChange(paceProgress.projection, averageLast3Months),
      businessDays: { total: businessDays.total, elapsed: businessDays.elapsed },
    },
    pipelineId,
    funnel: {
      pipelineId: funnelPipeline.id,
      pipelineName: funnelPipeline.name,
      leads,
      steps: buildFunnel(stageEntries, funnelPipeline.stages),
    },
    health: {
      openCount: openTotals._count,
      openValue: Number(openTotals._sum.value ?? 0),
      cooling,
      overdueClose,
      salesCycleDays: averageCycleDays(sales),
    },
    goals: { month: monthId, rows: goalRows },
    team: isSeller
      ? null
      : buildTeamRows({
          members,
          won: sales,
          lost: lostCurrent.map((loss) => ({ ownerId: loss.ownerId })),
          monthRevenue,
          goals: ownerId
            ? new Map([...sellerGoals].filter(([sellerId]) => sellerId === ownerId))
            : sellerGoals,
        }),
    origins: rankGroups(
      sales.map((sale) => ({ key: sale.source, value: sale.value })),
      { top: 3, emptyLabel: "Sem origem" }
    ),
    lossReasons: rankGroups(
      lostCurrent.map((loss) => ({ key: loss.lostReason, value: Number(loss.value) })),
      { top: 3, emptyLabel: "Sem motivo" }
    ),
  }
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function rate(won: number, lost: number) {
  return won + lost === 0 ? null : round1((won / (won + lost)) * 100)
}
