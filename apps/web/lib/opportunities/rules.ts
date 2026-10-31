export type OpportunityStage =
  | "PROSPECTING"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST"

/** Probabilidade padrao de cada etapa: fechadas sao sempre 100 ou 0. */
export const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  PROSPECTING: 10,
  QUALIFICATION: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
}

export const MIN_LOST_REASON_LENGTH = 3

export function isClosedStage(stage: OpportunityStage): boolean {
  return stage === "CLOSED_WON" || stage === "CLOSED_LOST"
}

export interface StageChange {
  stage: OpportunityStage
  probability: number
  wonAt: Date | null
  lostAt: Date | null
  lostReason: string | null
  stageChangedAt: Date
}

export type StageTransition =
  | { ok: true; unchanged: true }
  | { ok: true; unchanged: false; data: StageChange }
  | { ok: false; status: 403 | 422; error: string }

export function planStageTransition(input: {
  from: OpportunityStage
  to: OpportunityStage
  lostReason?: string | null
  canReopen: boolean
  now: Date
}): StageTransition {
  const { from, to, now } = input

  if (from === to) return { ok: true, unchanged: true }

  if (isClosedStage(from) && !input.canReopen) {
    return {
      ok: false,
      status: 403,
      error: "Somente gestor ou administrador pode reabrir uma negociacao encerrada.",
    }
  }

  const lostReason = input.lostReason?.trim() ?? ""

  if (to === "CLOSED_LOST" && lostReason.length < MIN_LOST_REASON_LENGTH) {
    return { ok: false, status: 422, error: "Informe o motivo da perda." }
  }

  return {
    ok: true,
    unchanged: false,
    data: {
      stage: to,
      probability: STAGE_PROBABILITY[to],
      wonAt: to === "CLOSED_WON" ? now : null,
      lostAt: to === "CLOSED_LOST" ? now : null,
      lostReason: to === "CLOSED_LOST" ? lostReason : null,
      stageChangedAt: now,
    },
  }
}

export type OpportunityLinks =
  | { ok: true; companyId: string | null }
  | { ok: false; error: string }

/**
 * Contato vinculado a outra empresa invalida a oportunidade. Sem empresa
 * informada, herda a empresa do contato.
 */
export function resolveOpportunityLinks(input: {
  companyId: string | null
  contact: { companyId: string | null } | null
}): OpportunityLinks {
  const contactCompanyId = input.contact?.companyId ?? null

  if (input.companyId && contactCompanyId && contactCompanyId !== input.companyId) {
    return { ok: false, error: "O contato pertence a outra empresa." }
  }

  return { ok: true, companyId: input.companyId ?? contactCompanyId }
}
