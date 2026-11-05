export type OpportunityStatus = "OPEN" | "WON" | "LOST"

export const OPPORTUNITY_STATUSES = ["OPEN", "WON", "LOST"] as const

export const MIN_LOST_REASON_LENGTH = 3

/** Campos que uma etapa pode exigir para a negociacao entrar nela. */
export const REQUIRABLE_FIELDS = [
  { key: "value", label: "Valor" },
  { key: "companyId", label: "Empresa" },
  { key: "contactId", label: "Contato" },
  { key: "expectedClose", label: "Previsão de fechamento" },
] as const

export type RequirableField = (typeof REQUIRABLE_FIELDS)[number]["key"]

export const REQUIRABLE_KEYS = REQUIRABLE_FIELDS.map((field) => field.key)

export type OpportunityRequiredData = {
  value: number
  companyId: string | null
  contactId: string | null
  expectedClose: Date | null
}

/** Rotulos dos campos exigidos que estao vazios (valor zero conta como vazio). */
export function missingFields(required: readonly string[], data: OpportunityRequiredData): string[] {
  return REQUIRABLE_FIELDS.filter(
    ({ key }) => required.includes(key) && !data[key]
  ).map(({ label }) => label)
}

/** Etapa de um funil, como as regras precisam dela. */
export interface StageRef {
  id: string
  pipelineId: string
  probability: number
  archived: boolean
  requiredFields: string[]
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
 * enquanto continuar encerrada. Entrar numa etapa exige os campos dela; ganhar
 * exige valor. Perder nunca e bloqueado por campo faltando.
 */
export function planOpportunityChange(input: {
  current: { status: OpportunityStatus; stage: StageRef; data: OpportunityRequiredData }
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

  if (status !== "LOST" && stageChanged) {
    const missing = missingFields(stage.requiredFields, current.data)
    if (missing.length > 0) {
      return { ok: false, status: 422, error: `Esta etapa exige: ${missing.join(", ")}.` }
    }
  }

  if (status === "WON" && statusChanged && !(current.data.value > 0)) {
    return { ok: false, status: 422, error: "Informe o valor antes de ganhar a negociacao." }
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

export interface OpportunityFields {
  title: string
  value: number
  companyId: string | null
  contactId: string | null
  ownerId: string | null
  expectedClose: Date | null
  notes: string | null
}

export type OpportunityFieldName = keyof OpportunityFields

const FIELD_NAMES: OpportunityFieldName[] = [
  "title",
  "value",
  "companyId",
  "contactId",
  "ownerId",
  "expectedClose",
  "notes",
]

function same(a: OpportunityFields[OpportunityFieldName], b: OpportunityFields[OpportunityFieldName]) {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  return a === b
}

export type OpportunityEditPlan =
  | { ok: true; changes: Partial<OpportunityFields>; fields: OpportunityFieldName[] }
  | { ok: false; status: 403 | 422; error: string }

/**
 * Compara com o estado atual e devolve so o que mudou. Trocar o dono exige
 * gestor ou administrador; negociacao encerrada tambem, pois o valor dela ja
 * conta no faturamento. Em andamento, nao apaga campo exigido pela etapa atual;
 * o que ja faltava antes da exigencia nao impede editar o resto. Ganha nao fica
 * sem valor. Campo ausente em `next` nao muda.
 */
export function planOpportunityEdit(input: {
  current: OpportunityFields
  next: Partial<OpportunityFields>
  status: OpportunityStatus
  /** Campos exigidos pela etapa atual. */
  requiredFields: string[]
  canAssign: boolean
  canEditClosed: boolean
}): OpportunityEditPlan {
  const { current, next, status } = input
  const closed = status !== "OPEN"
  const fields = FIELD_NAMES.filter(
    (field) => next[field] !== undefined && !same(next[field] as OpportunityFields[typeof field], current[field])
  )

  if (fields.length > 0 && closed && !input.canEditClosed) {
    return {
      ok: false,
      status: 403,
      error: "Somente gestor ou administrador pode editar uma negociacao encerrada.",
    }
  }

  if (fields.includes("ownerId") && !input.canAssign) {
    return { ok: false, status: 403, error: "Somente gestor ou administrador pode trocar o dono." }
  }

  const merged = { ...current, ...Object.fromEntries(fields.map((field) => [field, next[field]])) }

  if (!closed) {
    const emptied = input.requiredFields.filter((field) => fields.includes(field as OpportunityFieldName))
    const missing = missingFields(emptied, merged)
    if (missing.length > 0) {
      return { ok: false, status: 422, error: `Esta etapa exige: ${missing.join(", ")}.` }
    }
  }

  if (status === "WON" && fields.includes("value") && !(merged.value > 0)) {
    return { ok: false, status: 422, error: "Uma negociacao ganha precisa ter valor." }
  }

  return {
    ok: true,
    fields,
    changes: Object.fromEntries(fields.map((field) => [field, next[field]])),
  }
}

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  OPEN: "Em andamento",
  WON: "Ganha",
  LOST: "Perdida",
}
