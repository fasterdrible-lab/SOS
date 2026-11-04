// Edicao dos dados da negociacao (etapa e status ficam em rules.ts). Regra pura.

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
  | { ok: false; status: 403; error: string }

/**
 * Compara com o estado atual e devolve so o que mudou. Trocar o dono exige
 * gestor ou administrador; negociacao encerrada tambem, pois o valor dela ja
 * conta no faturamento. Campo ausente em `next` nao muda.
 */
export function planOpportunityEdit(input: {
  current: OpportunityFields
  next: Partial<OpportunityFields>
  closed: boolean
  canAssign: boolean
  canEditClosed: boolean
}): OpportunityEditPlan {
  const { current, next } = input
  const fields = FIELD_NAMES.filter(
    (field) => next[field] !== undefined && !same(next[field] as OpportunityFields[typeof field], current[field])
  )

  if (fields.length > 0 && input.closed && !input.canEditClosed) {
    return {
      ok: false,
      status: 403,
      error: "Somente gestor ou administrador pode editar uma negociacao encerrada.",
    }
  }

  if (fields.includes("ownerId") && !input.canAssign) {
    return { ok: false, status: 403, error: "Somente gestor ou administrador pode trocar o dono." }
  }

  return {
    ok: true,
    fields,
    changes: Object.fromEntries(fields.map((field) => [field, next[field]])),
  }
}
