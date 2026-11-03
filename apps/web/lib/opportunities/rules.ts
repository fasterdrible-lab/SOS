export type OpportunityStatus = "OPEN" | "WON" | "LOST"

export const OPPORTUNITY_STATUSES = ["OPEN", "WON", "LOST"] as const

export const MIN_LOST_REASON_LENGTH = 3

/** Etapa de um funil, como as regras precisam dela. */
export interface StageRef {
  id: string
  pipelineId: string
  probability: number
  archived: boolean
}

export interface OpportunityChange {
  pipelineId: string
  stageId: string
  status: OpportunityStatus
  probability: number
  wonAt: Date | null
  lostAt: Date | null
  lostReason: string | null
  stageChangedAt: Date
}

export type OpportunityTransition =
  | { ok: true; unchanged: true }
  | { ok: true; unchanged: false; data: OpportunityChange }
  | { ok: false; status: 403 | 422; error: string }

/**
 * Mudanca de etapa e/ou de status. Ganhar fixa 100%, perder fixa 0% e exige
 * motivo; em andamento usa a probabilidade da etapa. Encerrada so muda de
 * status (reabrir ou trocar o resultado) com permissao, e nao troca de etapa
 * enquanto continuar encerrada.
 */
export function planOpportunityChange(input: {
  current: { status: OpportunityStatus; stage: StageRef }
  /** Ausente: mantem a etapa. */
  targetStage?: StageRef | null
  /** Ausente: mantem o status. */
  targetStatus?: OpportunityStatus
  lostReason?: string | null
  canReopen: boolean
  now: Date
}): OpportunityTransition {
  const { current, now } = input
  const stage = input.targetStage ?? current.stage
  const status = input.targetStatus ?? current.status
  const stageChanged = stage.id !== current.stage.id
  const statusChanged = status !== current.status

  if (!stageChanged && !statusChanged) return { ok: true, unchanged: true }

  // Nem mover para etapa removida, nem deixar em andamento uma negociacao que
  // ficou nela ao ser encerrada.
  if (stage.archived && (stageChanged || status === "OPEN")) {
    return { ok: false, status: 422, error: "Esta etapa foi removida do funil." }
  }

  if (current.status !== "OPEN") {
    if (statusChanged && !input.canReopen) {
      return {
        ok: false,
        status: 403,
        error: "Somente gestor ou administrador pode reabrir uma negociacao encerrada.",
      }
    }
    if (stageChanged && status !== "OPEN") {
      return { ok: false, status: 422, error: "Reabra a negociacao para mudar de etapa." }
    }
  }

  const lostReason = input.lostReason?.trim() ?? ""
  if (status === "LOST" && statusChanged && lostReason.length < MIN_LOST_REASON_LENGTH) {
    return { ok: false, status: 422, error: "Informe o motivo da perda." }
  }

  return {
    ok: true,
    unchanged: false,
    data: {
      pipelineId: stage.pipelineId,
      stageId: stage.id,
      status,
      probability: status === "WON" ? 100 : status === "LOST" ? 0 : stage.probability,
      wonAt: status === "WON" ? now : null,
      lostAt: status === "LOST" ? now : null,
      lostReason: status === "LOST" ? lostReason : null,
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

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  OPEN: "Em andamento",
  WON: "Ganha",
  LOST: "Perdida",
}
