import type { Prisma } from "@/lib/generated/prisma/client"
import { STAGE_PROBABILITY } from "@/lib/opportunities/rules"

type OpportunityCreateData = Omit<
  Prisma.OpportunityUncheckedCreateInput,
  "stage" | "probability" | "wonAt" | "lostAt" | "lostReason" | "stageChangedAt"
>

/** Toda oportunidade nasce em prospeccao e com a primeira entrada do historico. */
export async function createOpportunity(
  tx: Prisma.TransactionClient,
  data: OpportunityCreateData,
  changedById: string | null
) {
  const opportunity = await tx.opportunity.create({
    data: {
      ...data,
      stage: "PROSPECTING",
      probability: STAGE_PROBABILITY.PROSPECTING,
    },
  })

  await tx.opportunityStageHistory.create({
    data: {
      organizationId: opportunity.organizationId,
      opportunityId: opportunity.id,
      fromStage: null,
      toStage: opportunity.stage,
      changedById,
    },
  })

  return opportunity
}

/** `Decimal` vira texto no JSON: a API devolve o valor como numero. */
export function serializeOpportunity<T extends { value: Prisma.Decimal }>(opportunity: T) {
  return { ...opportunity, value: Number(opportunity.value) }
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  )
}
