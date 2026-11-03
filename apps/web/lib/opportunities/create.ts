import type { Prisma } from "@/lib/generated/prisma/client"
import type { StageRef } from "@/lib/opportunities/rules"
import { ensureDefaultPipeline } from "@/lib/pipelines/service"

type OpportunityCreateData = Omit<
  Prisma.OpportunityUncheckedCreateInput,
  | "pipelineId"
  | "stageId"
  | "status"
  | "probability"
  | "wonAt"
  | "lostAt"
  | "lostReason"
  | "stageChangedAt"
>

/**
 * Toda oportunidade nasce em andamento, com a primeira entrada do historico.
 * Sem etapa informada (ja validada por quem chama), entra na primeira etapa do
 * funil padrao.
 */
export async function createOpportunity(
  tx: Prisma.TransactionClient,
  data: OpportunityCreateData,
  changedById: string | null,
  stage?: StageRef
) {
  const target = stage ?? (await ensureDefaultPipeline(tx, data.organizationId))

  const opportunity = await tx.opportunity.create({
    data: {
      ...data,
      pipelineId: target.pipelineId,
      stageId: target.id,
      status: "OPEN",
      probability: target.probability,
    },
  })

  await tx.opportunityStageHistory.create({
    data: {
      organizationId: opportunity.organizationId,
      opportunityId: opportunity.id,
      fromStageId: null,
      fromStatus: null,
      toStageId: opportunity.stageId,
      toStatus: opportunity.status,
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
