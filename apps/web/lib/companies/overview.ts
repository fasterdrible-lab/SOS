import { listActivities, type ActivityItem } from "@/lib/activities/service"
import { getAccessLevel, hasPermission, opportunityScope } from "@/lib/authz/permissions"
import { summarizeOpportunities, type CompanySummary } from "@/lib/companies/summary"
import { prisma } from "@/lib/db"
import { describeHistoryChange, type OpportunityStatus } from "@/lib/opportunities/rules"

const TIMELINE_LIMIT = 15
const ACTIVITY_LIMIT = 20

export interface CompanyOverview {
  id: string
  name: string
  segment: string | null
  website: string | null
  phone: string | null
  email: string | null
  createdAt: string
  /** OWN: o vendedor ve so as proprias negociacoes da empresa. */
  scope: "OWN" | "ORGANIZATION"
  summary: Omit<CompanySummary, "lastMovementAt"> & { lastMovementAt: string | null }
  opportunities: {
    id: string
    title: string
    value: number
    status: OpportunityStatus
    stageName: string
    pipelineName: string
    ownerName: string | null
    expectedClose: string | null
  }[]
  contacts: {
    id: string
    name: string
    role: string | null
    email: string | null
    phone: string | null
    companyId: string | null
  }[]
  /** Pendentes primeiro; no escopo do papel. */
  activities: ActivityItem[]
  /** Nulo quando o papel nao acompanha o IA SDR. */
  leads: { id: string; name: string; source: string | null; status: string; createdAt: string }[] | null
  /** Ligado pelo nome da empresa: `Diagnostic` nao referencia `Company`. */
  diagnostic: { id: string; maturityScore: number | null; createdAt: string } | null
  timeline: { id: string; at: string; opportunityId: string; opportunityTitle: string; description: string; byName: string | null }[]
}

/** Nulo se a empresa nao existe ou e de outra organizacao. */
export async function getCompanyOverview(input: {
  id: string
  organizationId: string
  userId: string
  role: string | null | undefined
}): Promise<CompanyOverview | null> {
  const { id, organizationId, userId, role } = input

  const company = await prisma.company.findFirst({ where: { id, organizationId } })
  if (!company) return null

  const scoped = { organizationId, companyId: id, ...opportunityScope(role, userId) }

  const [activities, opportunities, contacts, leads, diagnostic, history] = await Promise.all([
    listActivities({
      organizationId,
      userId,
      role,
      where: { companyId: id },
      orderBy: [{ completedAt: { sort: "asc", nulls: "first" } }, { dueDate: { sort: "asc", nulls: "last" } }],
      take: ACTIVITY_LIMIT,
    }),
    prisma.opportunity.findMany({
      where: scoped,
      include: {
        stage: { select: { name: true } },
        pipeline: { select: { name: true } },
        owner: { select: { name: true, email: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.contact.findMany({
      where: { organizationId, companyId: id },
      select: { id: true, name: true, role: true, email: true, phone: true, companyId: true },
      orderBy: { name: "asc" },
    }),
    hasPermission(role, "sdr:read")
      ? prisma.lead.findMany({
          where: { organizationId, companyId: id },
          select: { id: true, name: true, source: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        })
      : null,
    prisma.diagnostic.findFirst({
      where: { organizationId, companyName: { equals: company.name, mode: "insensitive" } },
      select: { id: true, maturityScore: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.opportunityStageHistory.findMany({
      where: { organizationId, opportunity: scoped },
      include: {
        opportunity: { select: { title: true } },
        changedBy: { select: { name: true, email: true } },
        fromStage: { select: { name: true } },
        toStage: { select: { name: true } },
      },
      orderBy: [{ changedAt: "desc" }, { id: "desc" }],
      take: TIMELINE_LIMIT,
    }),
  ])

  const summary = summarizeOpportunities(
    opportunities.map((row) => ({
      value: Number(row.value),
      status: row.status,
      stageChangedAt: row.stageChangedAt,
    }))
  )

  return {
    id: company.id,
    name: company.name,
    segment: company.segment,
    website: company.website,
    phone: company.phone,
    email: company.email,
    createdAt: company.createdAt.toISOString(),
    scope: getAccessLevel(role) === "SELLER" ? "OWN" : "ORGANIZATION",
    summary: { ...summary, lastMovementAt: summary.lastMovementAt?.toISOString() ?? null },
    opportunities: opportunities.map((row) => ({
      id: row.id,
      title: row.title,
      value: Number(row.value),
      status: row.status,
      stageName: row.stage.name,
      pipelineName: row.pipeline.name,
      ownerName: row.owner ? row.owner.name || row.owner.email : null,
      expectedClose: row.expectedClose?.toISOString() ?? null,
    })),
    contacts,
    activities,
    leads:
      leads?.map((lead) => ({ ...lead, status: lead.status as string, createdAt: lead.createdAt.toISOString() })) ??
      null,
    diagnostic: diagnostic
      ? {
          id: diagnostic.id,
          maturityScore: diagnostic.maturityScore,
          createdAt: diagnostic.createdAt.toISOString(),
        }
      : null,
    timeline: history.map((entry) => ({
      id: entry.id,
      at: entry.changedAt.toISOString(),
      opportunityId: entry.opportunityId,
      opportunityTitle: entry.opportunity.title,
      description: describeHistoryChange({
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        fromStageName: entry.fromStage?.name ?? null,
        toStageName: entry.toStage.name,
      }),
      byName: entry.changedBy ? entry.changedBy.name || entry.changedBy.email : null,
    })),
  }
}
