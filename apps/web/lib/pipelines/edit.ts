// Plano de edicao das etapas de um funil. Regra pura: a gravacao fica na rota.

export interface ExistingStage {
  id: string
  /** Negociacoes em andamento nesta etapa. */
  openCount: number
}

export interface IncomingStage {
  /** Ausente: etapa nova. */
  id?: string
  name: string
  probability: number
  isProposal: boolean
  /** Ausente: nenhuma exigencia. */
  requiredFields?: string[]
}

export type StageEditPlan =
  | {
      ok: true
      /** Na ordem final; `position` comeca em 1. */
      upserts: (IncomingStage & { position: number })[]
      archive: string[]
    }
  | { ok: false; status: 404 | 409 | 422; error: string }

/**
 * A lista recebida e o funil inteiro, na ordem desejada. Etapa existente que
 * nao veio na lista e arquivada, o que so e permitido sem negociacoes em
 * andamento nela (as encerradas continuam apontando para a etapa arquivada).
 */
export function planStageEdits(existing: ExistingStage[], incoming: IncomingStage[]): StageEditPlan {
  if (incoming.length === 0) {
    return { ok: false, status: 422, error: "O funil precisa de ao menos uma etapa." }
  }

  const known = new Map(existing.map((stage) => [stage.id, stage]))
  const seen = new Set<string>()
  for (const stage of incoming) {
    if (!stage.id) continue
    if (!known.has(stage.id)) {
      return { ok: false, status: 404, error: "Etapa nao encontrada neste funil." }
    }
    if (seen.has(stage.id)) {
      return { ok: false, status: 422, error: "Etapa repetida." }
    }
    seen.add(stage.id)
  }

  const names = incoming.map((stage) => stage.name.trim().toLocaleLowerCase("pt-BR"))
  if (new Set(names).size !== names.length) {
    return { ok: false, status: 422, error: "Ha etapas com o mesmo nome." }
  }

  const archive = existing.filter((stage) => !seen.has(stage.id))
  const blocked = archive.find((stage) => stage.openCount > 0)
  if (blocked) {
    return {
      ok: false,
      status: 409,
      error: "Mova as negociacoes em andamento antes de remover a etapa.",
    }
  }

  return {
    ok: true,
    upserts: incoming.map((stage, index) => ({ ...stage, name: stage.name.trim(), position: index + 1 })),
    archive: archive.map((stage) => stage.id),
  }
}
