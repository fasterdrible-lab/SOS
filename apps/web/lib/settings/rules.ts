// Configuracoes comerciais da organizacao (V2-9.3): regras puras, sem banco.

/** Sem mudar de etapa ha mais que isso, a negociacao esta esfriando. */
export const DEFAULT_COOLING_AFTER_DAYS = 14
export const COOLING_DAYS_MIN = 1
export const COOLING_DAYS_MAX = 180
export const MAX_HOLIDAYS = 100

export interface CommercialSettings {
  coolingAfterDays: number
  /** Feriados (AAAA-MM-DD), em ordem: saem da conta de dias uteis. */
  holidays: string[]
}

export const DEFAULT_COMMERCIAL_SETTINGS: CommercialSettings = {
  coolingAfterDays: DEFAULT_COOLING_AFTER_DAYS,
  holidays: [],
}

/** AAAA-MM-DD de um dia que existe no calendario (2026-02-30 nao existe). */
export function isCalendarDay(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** Sem repetidos e em ordem de data. */
export function normalizeHolidays(values: readonly string[]): string[] {
  return [...new Set(values)].sort()
}

/** Nomes dos campos que mudam, para a auditoria. */
export function changedSettings(before: CommercialSettings, after: CommercialSettings): string[] {
  const changed: string[] = []
  if (before.coolingAfterDays !== after.coolingAfterDays) changed.push("coolingAfterDays")
  if (before.holidays.join(",") !== after.holidays.join(",")) changed.push("holidays")
  return changed
}
