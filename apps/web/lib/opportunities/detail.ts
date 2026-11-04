import { opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import type { OpportunityStatus } from "@/lib/opportunities/rules"

export interface OpportunityHistoryEntry {
  id: string
  changedAt: string
  changedByName: string | null
  fromStageName: string | null
  toStageName: string
  fromStatus: OpportunityStatus | null
  toStatus: OpportunityStatus
  lostReason: string | null
}

export interface OpportunityDetail {
  id: string
  title: string
  value: number
  status: OpportunityStatus
  probability: number
  notes: string | null
  lostReason: string | null
  expectedClose: string | null
  wonAt: string | null
  lostAt: string | null
  createdAt: string
  stageChangedAt: string
  pipeline: { id: string; name: string }
  stage: { id: string; name: string; archived: boolean }
  company: { id: string; name: string } | null
  contact: { id: string; name: string; email: string | null; phone: string | null } | null
  owner: { id: string; name: string } | null
  history: OpportunityHistoryEntry[]
}

/** Nulo se nao existe, e de outra organizacao ou esta fora do escopo do vendedor. */
export async function getOpportunityDetail(input: {
  id: string
  organizationId: string
  userId: string
  role: string | null | undefined
}): Promise<OpportunityDetail | null> {
  const row = await prisma.opportunity.findFirst({
    where: {
      id: input.id,
      organizationId: input.organizationId,
      ...opportunityScope(input.role, input.userId),
    },
    include: {
      pipeline: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true, archivedAt: true } },
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true, email: true, phone: true } },
      owner: { select: { id: true, name: true, email: true } },
      stageHistory: {
        orderBy: [{ changedAt: "desc" }, { id: "desc" }],
        include: {
          changedBy: { select: { name: true, email: true } },
          fromStage: { select: { name: true } },
          toStage: { select: { name: true } },
        },
      },
    },
  })

  if (!row) return null

  return {
    id: row.id,
    title: row.title,
    value: Number(row.value),
    status: row.status,
    probability: row.probability,
    notes: row.notes,
    lostReason: row.lostReason,
    expectedClose: row.expectedClose?.toISOString() ?? null,
    wonAt: row.wonAt?.toISOString() ?? null,
    lostAt: row.lostAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    stageChangedAt: row.stageChangedAt.toISOString(),
    pipeline: row.pipeline,
    stage: { id: row.stage.id, name: row.stage.name, archived: row.stage.archivedAt !== null },
    company: row.company,
    contact: row.contact,
    owner: row.owner ? { id: row.owner.id, name: row.owner.name || row.owner.email } : null,
    history: row.stageHistory.map((entry) => ({
      id: entry.id,
      changedAt: entry.changedAt.toISOString(),
      changedByName: entry.changedBy ? entry.changedBy.name || entry.changedBy.email : null,
      fromStageName: entry.fromStage?.name ?? null,
      toStageName: entry.toStage.name,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      lostReason: entry.lostReason,
    })),
  }
}
