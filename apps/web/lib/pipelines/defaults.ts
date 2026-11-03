// Funil padrao criado para toda organizacao (o mesmo da migration 20261103000000_pipelines).

export const DEFAULT_PIPELINE_NAME = "Vendas"

export const DEFAULT_STAGES = [
  { name: "Prospecção", probability: 10, isProposal: false },
  { name: "Qualificação", probability: 25, isProposal: false },
  { name: "Proposta", probability: 50, isProposal: true },
  { name: "Negociação", probability: 75, isProposal: false },
] as const

/** Ids deterministicos: duas criacoes simultaneas nao geram dois funis padrao. */
export function defaultPipelineId(organizationId: string) {
  return `pipe_${organizationId}`
}

export function defaultStageId(organizationId: string, position: number) {
  return `stg_${organizationId}_${position}`
}

export const MAX_STAGES = 20
