// Regras do Report Diario (V2-8.1). Puras: consultas e gravacao em service.ts.
// So importa tipos, para rodar nos testes sem o bundler.
import type { Day } from "@/lib/dashboard/period"

function dayKey({ year, month, day }: Day): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function addDays({ year, month, day }: Day, days: number): Day {
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

/** Tipos de atividade que contam como follow-up feito. */
export const FOLLOW_UP_TYPES = ["FOLLOW_UP", "CALL", "EMAIL"] as const

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** "AAAA-MM-DD" valido do calendario, ou nulo. */
export function parseDayKey(value: string | null | undefined): Day | null {
  const match = DAY_PATTERN.exec(value?.trim() ?? "")
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return { year, month, day }
}

export function compareDays(a: Day, b: Day): number {
  return dayKey(a) < dayKey(b) ? -1 : dayKey(a) > dayKey(b) ? 1 : 0
}

/** Dia pedido na URL; ausente, invalido ou futuro vira hoje. */
export function resolveReportDay(value: string | null | undefined, today: Day): Day {
  const day = parseDayKey(value)
  return day && compareDays(day, today) <= 0 ? day : today
}

export type CloseCheck = { ok: true } | { ok: false; status: 409 | 422; error: string }

/** So o proprio dia, hoje ou antes, e uma unica vez. */
export function canCloseDay(input: { day: Day; today: Day; alreadyClosed: boolean }): CloseCheck {
  if (compareDays(input.day, input.today) > 0) {
    return { ok: false, status: 422, error: "Nao e possivel fechar um dia que ainda nao chegou." }
  }
  if (input.alreadyClosed) return { ok: false, status: 409, error: "Este dia ja foi fechado." }
  return { ok: true }
}

/** Dia anterior e seguinte para a navegacao; nao passa de hoje. */
export function dayNavigation(day: Day, today: Day): { previous: string; next: string | null } {
  return {
    previous: dayKey(addDays(day, -1)),
    next: compareDays(day, today) < 0 ? dayKey(addDays(day, 1)) : null,
  }
}

type HistoryEntry = {
  opportunityId: string
  fromStatus: string | null
  toStatus: string
  fromPosition: number | null
  toPosition: number
  fromPipelineId: string | null
  toPipelineId: string
}

/**
 * Negociacoes que avancaram no funil: em andamento, para uma etapa de posicao
 * maior no mesmo funil. Cada negociacao conta uma vez no dia. Ganhar conta em
 * vendas; reabrir e trocar de funil nao contam.
 */
export function advancedOpportunityIds(entries: HistoryEntry[]): string[] {
  const ids = new Set<string>()
  for (const entry of entries) {
    if (entry.fromStatus !== "OPEN" || entry.toStatus !== "OPEN") continue
    if (entry.fromPosition === null || entry.fromPipelineId !== entry.toPipelineId) continue
    if (entry.toPosition > entry.fromPosition) ids.add(entry.opportunityId)
  }
  return [...ids]
}
