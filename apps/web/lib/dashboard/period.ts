// Periodos do Dashboard em datas do calendario (fuso de Brasilia ja aplicado por
// quem chama). Regra pura: a conversao para instantes fica em executive.ts.

export type PeriodKey = "mes" | "mes-anterior" | "90-dias" | "ano"

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "mes", label: "Este mês" },
  { key: "mes-anterior", label: "Mês anterior" },
  { key: "90-dias", label: "Últimos 90 dias" },
  { key: "ano", label: "Este ano" },
]

/** Mesmo formato de CalendarDate (lib/time/business-calendar.ts). */
export interface Day {
  year: number
  /** 1 a 12 */
  month: number
  day: number
}

export interface DayRange {
  start: Day
  /** Exclusivo */
  end: Day
}

export interface PeriodWindow {
  key: PeriodKey
  label: string
  current: DayRange
  /** Mesmo tamanho, imediatamente antes (ou o trecho equivalente do mes/ano anterior). */
  previous: DayRange
}

export function parsePeriod(value: string | null | undefined): PeriodKey {
  return PERIOD_OPTIONS.some((option) => option.key === value) ? (value as PeriodKey) : "mes"
}

function toUtc({ year, month, day }: Day) {
  return Date.UTC(year, month - 1, day)
}

function fromUtc(time: number): Day {
  const date = new Date(time)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

export function addDays(day: Day, days: number): Day {
  return fromUtc(toUtc(day) + days * 86_400_000)
}

function firstOfMonth(year: number, month: number): Day {
  const date = new Date(Date.UTC(year, month - 1, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: 1 }
}

function daysBetween(start: Day, end: Day) {
  return Math.round((toUtc(end) - toUtc(start)) / 86_400_000)
}

function minDay(a: Day, b: Day): Day {
  return toUtc(a) <= toUtc(b) ? a : b
}

export function periodWindow(key: PeriodKey, today: Day): PeriodWindow {
  const label = PERIOD_OPTIONS.find((option) => option.key === key)!.label
  const tomorrow = addDays(today, 1)
  const monthStart = firstOfMonth(today.year, today.month)
  const previousMonthStart = firstOfMonth(today.year, today.month - 1)

  switch (key) {
    case "mes":
      // Do dia 1 ate hoje, contra os mesmos dias do mes anterior.
      return {
        key,
        label,
        current: { start: monthStart, end: tomorrow },
        previous: {
          start: previousMonthStart,
          end: minDay(addDays(previousMonthStart, today.day), monthStart),
        },
      }
    case "mes-anterior":
      return {
        key,
        label,
        current: { start: previousMonthStart, end: monthStart },
        previous: { start: firstOfMonth(today.year, today.month - 2), end: previousMonthStart },
      }
    case "90-dias":
      return {
        key,
        label,
        current: { start: addDays(today, -89), end: tomorrow },
        previous: { start: addDays(today, -179), end: addDays(today, -89) },
      }
    case "ano": {
      const yearStart = { year: today.year, month: 1, day: 1 }
      const lastYearStart = { year: today.year - 1, month: 1, day: 1 }
      return {
        key,
        label,
        current: { start: yearStart, end: tomorrow },
        previous: { start: lastYearStart, end: addDays(lastYearStart, daysBetween(yearStart, tomorrow)) },
      }
    }
  }
}

/** Os 7 dias, de segunda a domingo, da semana a `offset` semanas de hoje. */
export function weekDays(today: Day, offset = 0): Day[] {
  const weekday = new Date(toUtc(today)).getUTCDay()
  const monday = addDays(today, -((weekday + 6) % 7) + offset * 7)
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

export function dayKey({ year, month, day }: Day): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function eachDay(range: DayRange): Day[] {
  const days: Day[] = []
  for (let day = range.start; toUtc(day) < toUtc(range.end); day = addDays(day, 1)) days.push(day)
  return days
}

/** Variacao percentual com 1 casa; nula sem base de comparacao. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}
