import { recordAudit } from "@/lib/audit/record"
import { getAccessLevel } from "@/lib/authz/permissions"
import { addDays, dayKey, type Day } from "@/lib/dashboard/period"
import { prisma } from "@/lib/db"
import { isUniqueConstraintError } from "@/lib/opportunities/create"
import { advancedOpportunityIds, canCloseDay, FOLLOW_UP_TYPES } from "@/lib/report/rules"
import { diagnosisSummary } from "@/lib/saleia/rules"
import { toDiagnosis, type SaleiaDiagnosis } from "@/lib/saleia/service"
import { startOfCalendarDate } from "@/lib/time/business-calendar"

export interface ReportListItem {
  id: string
  title: string
  detail: string | null
  /** ISO; hora do que aconteceu. */
  at: string | null
  href: string | null
  /** So nas vendas. */
  value?: number
}

export interface ReportMetrics {
  meetingsDone: number
  /** Reunioes do SALEIA em que a oferta nao foi apresentada, sem as contestadas (V2-8.2). */
  diagnosisOnly: number
  followUpsDone: number
  advancedDeals: number
  salesCount: number
  salesRevenue: number
  pendingCount: number
}

export interface ClosedReport extends ReportMetrics {
  id: string
  day: string
  userId: string
  userName: string
  notes: string | null
  closedAt: string
}

export interface DailyReportView {
  day: string
  userId: string
  live: ReportMetrics & { saleiaMeetings: number }
  lists: {
    meetings: ReportListItem[]
    saleiaMeetings: ReportListItem[]
    followUps: ReportListItem[]
    advanced: ReportListItem[]
    sales: ReportListItem[]
    pending: ReportListItem[]
  }
  /** "So diagnostico": reunioes do SALEIA do dia em que a oferta nao foi apresentada. */
  diagnosis: {
    pending: number
    /** Reunioes do SALEIA do dia sem avaliacao da oferta. */
    unevaluated: number
    items: (ReportListItem & { diagnosis: SaleiaDiagnosis })[]
  }
  closed: ClosedReport | null
}

const LIST_LIMIT = 50

function dayWindow(day: Day) {
  return { gte: startOfCalendarDate(day), lt: startOfCalendarDate(addDays(day, 1)) }
}

function toClosed(row: {
  id: string
  day: string
  userId: string
  meetingsDone: number
  diagnosisOnly: number
  followUpsDone: number
  advancedDeals: number
  salesCount: number
  salesRevenue: { toString(): string }
  pendingCount: number
  notes: string | null
  closedAt: Date
  user: { name: string | null; email: string }
}): ClosedReport {
  return {
    id: row.id,
    day: row.day,
    userId: row.userId,
    userName: row.user.name || row.user.email,
    meetingsDone: row.meetingsDone,
    diagnosisOnly: row.diagnosisOnly,
    followUpsDone: row.followUpsDone,
    advancedDeals: row.advancedDeals,
    salesCount: row.salesCount,
    salesRevenue: Number(row.salesRevenue),
    pendingCount: row.pendingCount,
    notes: row.notes,
    closedAt: row.closedAt.toISOString(),
  }
}

const closedInclude = { user: { select: { name: true, email: true } } } as const

/** O dia de uma pessoa, calculado agora, e o fechamento, se houver. */
export async function getDailyReport(input: {
  organizationId: string
  /** Dono do dia (ja validado como membro). */
  userId: string
  day: Day
}): Promise<DailyReportView> {
  const { organizationId, userId, day } = input
  const window = dayWindow(day)
  const key = dayKey(day)
  const company = { select: { name: true } } as const

  const [meetings, saleiaMeetings, followUps, history, sales, pending, closed] = await Promise.all([
    prisma.activity.findMany({
      where: { organizationId, ownerId: userId, type: "MEETING", completedAt: window },
      select: { id: true, title: true, completedAt: true, company },
      orderBy: { completedAt: "asc" },
      take: LIST_LIMIT,
    }),
    prisma.saleiaMeeting.findMany({
      where: { organizationId, startedAt: window, opportunity: { ownerId: userId } },
      select: {
        id: true,
        title: true,
        startedAt: true,
        company,
        offerPresented: true,
        offerReason: true,
        diagnosisStatus: true,
        diagnosisReason: true,
        diagnosisDecidedAt: true,
      },
      orderBy: { startedAt: "asc" },
      take: LIST_LIMIT,
    }),
    prisma.activity.findMany({
      where: { organizationId, ownerId: userId, type: { in: [...FOLLOW_UP_TYPES] }, completedAt: window },
      select: { id: true, title: true, completedAt: true, company },
      orderBy: { completedAt: "asc" },
      take: LIST_LIMIT,
    }),
    prisma.opportunityStageHistory.findMany({
      where: { organizationId, changedById: userId, changedAt: window },
      select: {
        opportunityId: true,
        fromStatus: true,
        toStatus: true,
        changedAt: true,
        fromStage: { select: { position: true, pipelineId: true } },
        toStage: { select: { name: true, position: true, pipelineId: true } },
        opportunity: { select: { title: true } },
      },
      orderBy: { changedAt: "asc" },
    }),
    prisma.opportunity.findMany({
      where: { organizationId, ownerId: userId, status: "WON", wonAt: window },
      select: { id: true, title: true, value: true, wonAt: true, company },
      orderBy: { wonAt: "asc" },
      take: LIST_LIMIT,
    }),
    prisma.activity.findMany({
      where: { organizationId, ownerId: userId, completedAt: null, type: { not: "NOTE" }, dueDate: window },
      select: { id: true, title: true, dueDate: true, company },
      orderBy: { dueDate: "asc" },
      take: LIST_LIMIT,
    }),
    prisma.dailyReport.findUnique({
      where: { organizationId_userId_day: { organizationId, userId, day: key } },
      include: closedInclude,
    }),
  ])

  const advancedIds = advancedOpportunityIds(
    history.map((entry) => ({
      opportunityId: entry.opportunityId,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      fromPosition: entry.fromStage?.position ?? null,
      fromPipelineId: entry.fromStage?.pipelineId ?? null,
      toPosition: entry.toStage.position,
      toPipelineId: entry.toStage.pipelineId,
    }))
  )
  // A ultima etapa alcancada no dia, por negociacao.
  const advanced = advancedIds.map((id) => {
    const last = history.filter((entry) => entry.opportunityId === id).at(-1)!
    return {
      id,
      title: last.opportunity.title,
      detail: `Foi para ${last.toStage.name}`,
      at: last.changedAt.toISOString(),
      href: `/pipeline/${id}`,
    }
  })

  const salesRevenue = sales.reduce((sum, sale) => sum + Number(sale.value), 0)
  const diagnosis = diagnosisSummary(saleiaMeetings)

  return {
    day: key,
    userId,
    live: {
      meetingsDone: meetings.length,
      diagnosisOnly: diagnosis.count,
      saleiaMeetings: saleiaMeetings.length,
      followUpsDone: followUps.length,
      advancedDeals: advanced.length,
      salesCount: sales.length,
      salesRevenue: Math.round(salesRevenue * 100) / 100,
      pendingCount: pending.length,
    },
    lists: {
      meetings: meetings.map((row) => ({
        id: row.id,
        title: row.title,
        detail: row.company?.name ?? null,
        at: row.completedAt?.toISOString() ?? null,
        href: "/atividades",
      })),
      saleiaMeetings: saleiaMeetings.map((row) => ({
        id: row.id,
        title: row.title,
        detail: row.company?.name ?? null,
        at: row.startedAt.toISOString(),
        href: `/saleia/${row.id}`,
      })),
      followUps: followUps.map((row) => ({
        id: row.id,
        title: row.title,
        detail: row.company?.name ?? null,
        at: row.completedAt?.toISOString() ?? null,
        href: "/atividades",
      })),
      advanced,
      sales: sales.map((row) => ({
        id: row.id,
        title: row.title,
        detail: row.company?.name ?? null,
        at: row.wonAt?.toISOString() ?? null,
        href: `/pipeline/${row.id}`,
        value: Number(row.value),
      })),
      pending: pending.map((row) => ({
        id: row.id,
        title: row.title,
        detail: row.company?.name ?? null,
        at: row.dueDate?.toISOString() ?? null,
        href: "/atividades",
      })),
    },
    diagnosis: {
      pending: diagnosis.pending,
      unevaluated: diagnosis.unevaluated,
      // Contestadas continuam na lista, para poder desfazer.
      items: saleiaMeetings
        .filter((row) => row.offerPresented === false && row.diagnosisStatus !== null)
        .map((row) => ({
          id: row.id,
          title: row.title,
          detail: row.company?.name ?? null,
          at: row.startedAt.toISOString(),
          href: `/saleia/${row.id}`,
          diagnosis: toDiagnosis(row),
        })),
    },
    closed: closed ? toClosed(closed) : null,
  }
}

export type CloseResult = { ok: true; report: ClosedReport } | { ok: false; status: 409 | 422; error: string }

/** Fecha o proprio dia com os numeros de agora. */
export async function closeDailyReport(input: {
  organizationId: string
  userId: string
  day: Day
  today: Day
  notes: string | null
}): Promise<CloseResult> {
  const { organizationId, userId, day } = input
  const view = await getDailyReport({ organizationId, userId, day })

  const check = canCloseDay({ day, today: input.today, alreadyClosed: view.closed !== null })
  if (!check.ok) return check

  const { live } = view
  const metrics: ReportMetrics = {
    meetingsDone: live.meetingsDone,
    diagnosisOnly: live.diagnosisOnly,
    followUpsDone: live.followUpsDone,
    advancedDeals: live.advancedDeals,
    salesCount: live.salesCount,
    salesRevenue: live.salesRevenue,
    pendingCount: live.pendingCount,
  }

  try {
    const report = await prisma.$transaction(async (tx) => {
      const created = await tx.dailyReport.create({
        data: { organizationId, userId, day: view.day, ...metrics, notes: input.notes },
        include: closedInclude,
      })
      await recordAudit(
        {
          organizationId,
          actorUserId: userId,
          action: "daily-report.closed",
          entityType: "DailyReport",
          entityId: created.id,
          metadata: { day: view.day },
        },
        tx
      )
      return created
    })
    return { ok: true, report: toClosed(report) }
  } catch (error) {
    if (isUniqueConstraintError(error)) return { ok: false, status: 409, error: "Este dia ja foi fechado." }
    throw error
  }
}

/** Dias fechados, mais recentes primeiro. Vendedor ve so os proprios. */
export async function listClosedReports(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  /** Ja validado; ignorado para o vendedor. */
  sellerId?: string | null
  take?: number
}): Promise<ClosedReport[]> {
  const isSeller = getAccessLevel(input.role) === "SELLER"
  const userId = isSeller ? input.userId : (input.sellerId ?? undefined)
  const rows = await prisma.dailyReport.findMany({
    where: { organizationId: input.organizationId, ...(userId ? { userId } : {}) },
    include: closedInclude,
    orderBy: [{ day: "desc" }, { closedAt: "desc" }],
    take: input.take ?? 60,
  })
  return rows.map(toClosed)
}
