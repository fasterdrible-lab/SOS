import { prisma } from "@/lib/db"

const OPEN_OPPORTUNITY_STAGES = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
] as const

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

function getMonthWindows(): { current: MonthWindow; previous: MonthWindow } {
  const now = new Date()
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  return {
    current: { start: startOfCurrentMonth, end: now },
    previous: { start: startOfPreviousMonth, end: startOfCurrentMonth },
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

export async function getExecutiveKpis(organizationId: string): Promise<ExecutiveKpis> {
  const { current, previous } = getMonthWindows()

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
      where: { organizationId, stage: { in: [...OPEN_OPPORTUNITY_STAGES] } },
      _sum: { value: true },
    }),
    prisma.opportunity.aggregate({
      where: {
        organizationId,
        stage: { in: [...OPEN_OPPORTUNITY_STAGES] },
        createdAt: { gte: current.start },
      },
      _sum: { value: true },
    }),
    prisma.opportunity.aggregate({
      where: {
        organizationId,
        stage: { in: [...OPEN_OPPORTUNITY_STAGES] },
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
      where: { organizationId, stage: { in: [...OPEN_OPPORTUNITY_STAGES] } },
    }),
    prisma.opportunity.count({
      where: { organizationId, createdAt: { gte: current.start } },
    }),
    prisma.opportunity.count({
      where: { organizationId, createdAt: { gte: previous.start, lt: previous.end } },
    }),
    prisma.opportunity.count({ where: { organizationId, stage: "CLOSED_WON" } }),
    prisma.opportunity.count({ where: { organizationId, stage: "CLOSED_LOST" } }),
    prisma.opportunity.count({
      where: { organizationId, stage: "CLOSED_WON", updatedAt: { gte: current.start } },
    }),
    prisma.opportunity.count({
      where: { organizationId, stage: "CLOSED_LOST", updatedAt: { gte: current.start } },
    }),
    prisma.opportunity.count({
      where: {
        organizationId,
        stage: "CLOSED_WON",
        updatedAt: { gte: previous.start, lt: previous.end },
      },
    }),
    prisma.opportunity.count({
      where: {
        organizationId,
        stage: "CLOSED_LOST",
        updatedAt: { gte: previous.start, lt: previous.end },
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
    pipelineTotal: openPipeline._sum.value ?? 0,
    pipelineChangePct: percentChange(
      pipelineCurrentMonth._sum.value ?? 0,
      pipelinePreviousMonth._sum.value ?? 0
    ),
    activeLeads,
    leadsChangePct: percentChange(leadsCurrentMonth, leadsPreviousMonth),
    openOpportunities,
    opportunitiesChangePct: percentChange(opportunitiesCurrentMonth, opportunitiesPreviousMonth),
    conversionRate,
    conversionChangePp: conversionCurrentMonth - conversionPreviousMonth,
  }
}
