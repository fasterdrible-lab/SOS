import { prisma } from "@/lib/db"
import { monthRange } from "@/lib/time/business-calendar"

const ACTIVE_LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED"] as const

export interface ExecutiveKpis {
  pipelineTotal: number
  pipelineChangePct: number
  activeLeads: number
  leadsChangePct: number
  openOpportunities: number
  opportunitiesChangePct: number
  conversionRate: number
  conversionChangePp: number
}

interface MonthWindow {
  start: Date
  end: Date
}

// Meses no fuso de Brasilia: o servidor roda em UTC.
function getMonthWindows(): { current: MonthWindow; previous: MonthWindow } {
  const now = new Date()
  const current = monthRange(now)
  const previous = monthRange(new Date(current.start.getTime() - 1))

  return {
    current: { start: current.start, end: now },
    previous,
  }
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / previous) * 100
}

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return (numerator / denominator) * 100
}

export async function getExecutiveKpis(
  organizationId: string,
  scope: { ownerId?: string } = {}
): Promise<ExecutiveKpis> {
  const { current, previous } = getMonthWindows()
  const opportunityWhere = { organizationId, ...scope }

  const [
    openPipeline,
    pipelineCurrentMonth,
    pipelinePreviousMonth,
    activeLeads,
    leadsCurrentMonth,
    leadsPreviousMonth,
    openOpportunities,
    opportunitiesCurrentMonth,
    opportunitiesPreviousMonth,
    closedWonTotal,
    closedLostTotal,
    closedWonCurrentMonth,
    closedLostCurrentMonth,
    closedWonPreviousMonth,
    closedLostPreviousMonth,
  ] = await Promise.all([
    prisma.opportunity.aggregate({
      where: { ...opportunityWhere, status: "OPEN" },
      _sum: { value: true },
    }),
    prisma.opportunity.aggregate({
      where: {
        ...opportunityWhere,
        status: "OPEN",
        createdAt: { gte: current.start },
      },
      _sum: { value: true },
    }),
    prisma.opportunity.aggregate({
      where: {
        ...opportunityWhere,
        status: "OPEN",
        createdAt: { gte: previous.start, lt: previous.end },
      },
      _sum: { value: true },
    }),
    prisma.lead.count({
      where: { organizationId, status: { in: [...ACTIVE_LEAD_STATUSES] } },
    }),
    prisma.lead.count({
      where: { organizationId, createdAt: { gte: current.start } },
    }),
    prisma.lead.count({
      where: { organizationId, createdAt: { gte: previous.start, lt: previous.end } },
    }),
    prisma.opportunity.count({
      where: { ...opportunityWhere, status: "OPEN" },
    }),
    prisma.opportunity.count({
      where: { ...opportunityWhere, createdAt: { gte: current.start } },
    }),
    prisma.opportunity.count({
      where: { ...opportunityWhere, createdAt: { gte: previous.start, lt: previous.end } },
    }),
    prisma.opportunity.count({ where: { ...opportunityWhere, status: "WON" } }),
    prisma.opportunity.count({ where: { ...opportunityWhere, status: "LOST" } }),
    prisma.opportunity.count({
      where: { ...opportunityWhere, status: "WON", wonAt: { gte: current.start } },
    }),
    prisma.opportunity.count({
      where: { ...opportunityWhere, status: "LOST", lostAt: { gte: current.start } },
    }),
    prisma.opportunity.count({
      where: {
        ...opportunityWhere,
        status: "WON",
        wonAt: { gte: previous.start, lt: previous.end },
      },
    }),
    prisma.opportunity.count({
      where: {
        ...opportunityWhere,
        status: "LOST",
        lostAt: { gte: previous.start, lt: previous.end },
      },
    }),
  ])

  const conversionRate = rate(closedWonTotal, closedWonTotal + closedLostTotal)
  const conversionCurrentMonth = rate(
    closedWonCurrentMonth,
    closedWonCurrentMonth + closedLostCurrentMonth
  )
  const conversionPreviousMonth = rate(
    closedWonPreviousMonth,
    closedWonPreviousMonth + closedLostPreviousMonth
  )

  return {
    pipelineTotal: Number(openPipeline._sum.value ?? 0),
    pipelineChangePct: percentChange(
      Number(pipelineCurrentMonth._sum.value ?? 0),
      Number(pipelinePreviousMonth._sum.value ?? 0)
    ),
    activeLeads,
    leadsChangePct: percentChange(leadsCurrentMonth, leadsPreviousMonth),
    openOpportunities,
    opportunitiesChangePct: percentChange(opportunitiesCurrentMonth, opportunitiesPreviousMonth),
    conversionRate,
    conversionChangePp: conversionCurrentMonth - conversionPreviousMonth,
  }
}
