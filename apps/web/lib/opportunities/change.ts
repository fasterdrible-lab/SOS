import type { Prisma } from "@/lib/generated/prisma/client"
import type { OpportunityChange, OpportunityStatus, StageRef } from "@/lib/opportunities/rules"

/** A negociacao mudou de etapa ou status entre a leitura e a gravacao. */
export class StaleOpportunityError extends Error {}

export function toStageRef(stage: {
  id: string
  pipelineId: string
  probability: number
  archivedAt: Date | null
  requiredFields: string[]
}): StageRef {
  return {
    id: stage.id,
    pipelineId: stage.pipelineId,
    probability: stage.probability,
    archived: stage.archivedAt !== null,
    requiredFields: stage.requiredFields,
  }
}

/**
 * Grava uma mudanca planejada por `planOpportunityChange` e a entrada do
 * historico. So aplica se etapa e status ainda forem os lidos: duas mudancas
 * simultaneas nao podem gerar historico com origem errada. Rode dentro de uma
 * transacao; lanca `StaleOpportunityError` se a negociacao mudou.
 */
export async function writeOpportunityChange(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    opportunityId: string
    from: { stageId: string; status: OpportunityStatus }
    change: OpportunityChange
    changedById: string
  }
) {
  const { organizationId, opportunityId, from, change } = input
  const { count } = await tx.opportunity.updateMany({
    where: { id: opportunityId, organizationId, stageId: from.stageId, status: from.status },
    data: change,
  })

  if (count === 0) throw new StaleOpportunityError()

  await tx.opportunityStageHistory.create({
    data: {
      organizationId,
      opportunityId,
      fromStageId: from.stageId,
      fromStatus: from.status,
      toStageId: change.stageId,
      toStatus: change.status,
      changedById: input.changedById,
      lostReason: change.lostReason,
      changedAt: change.stageChangedAt,
    },
  })
}
