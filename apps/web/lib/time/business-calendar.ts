/**
 * Datas do negocio no fuso de Brasilia. O servidor roda em UTC: "hoje" e "este
 * mes" precisam ser calculados no fuso da operacao, senao uma venda das 22h
 * cai no dia seguinte.
 */
export const BUSINESS_TIME_ZONE = "America/Sao_Paulo"

export interface CalendarDate {
  year: number
  /** 1 a 12 */
  month: number
  day: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string) {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
    formatters.set(timeZone, formatter)
  }
  return formatter
}

function zonedParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(date)
      .map((part) => [part.type, Number(part.value)])
  )
  return parts as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>
}

/** Minutos entre o horario local do fuso e UTC naquele instante. */
function offsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000)
}

export function calendarDateIn(date: Date, timeZone = BUSINESS_TIME_ZONE): CalendarDate {
  const { year, month, day } = zonedParts(date, timeZone)
  return { year, month, day }
}

/** Instante da meia-noite local de uma data do calendario. */
export function startOfCalendarDate(
  { year, month, day }: CalendarDate,
  timeZone = BUSINESS_TIME_ZONE
): Date {
  const naive = Date.UTC(year, month - 1, day)
  let instant = naive - offsetMinutes(new Date(naive), timeZone) * 60000
  // Segunda passada cobre mudanca de offset entre o palpite e a meia-noite real.
  instant = naive - offsetMinutes(new Date(instant), timeZone) * 60000
  return new Date(instant)
}

function addDays({ year, month, day }: CalendarDate, days: number): CalendarDate {
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export interface Range {
  start: Date
  /** Exclusivo */
  end: Date
}

export function dayRange(now: Date, timeZone = BUSINESS_TIME_ZONE): Range {
  const today = calendarDateIn(now, timeZone)
  return {
    start: startOfCalendarDate(today, timeZone),
    end: startOfCalendarDate(addDays(today, 1), timeZone),
  }
}

export function monthRange(now: Date, timeZone = BUSINESS_TIME_ZONE): Range {
  const { year, month } = calendarDateIn(now, timeZone)
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  return {
    start: startOfCalendarDate({ year, month, day: 1 }, timeZone),
    end: startOfCalendarDate({ ...next, day: 1 }, timeZone),
  }
}

/** Mes no formato AAAA-MM, usado como chave das metas. */
export function monthKey(now: Date, timeZone = BUSINESS_TIME_ZONE): string {
  const { year, month } = calendarDateIn(now, timeZone)
  return `${year}-${String(month).padStart(2, "0")}`
}

function isWeekday({ year, month, day }: CalendarDate): boolean {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return weekday !== 0 && weekday !== 6
}

export interface BusinessDays {
  /** Dias uteis do mes. */
  total: number
  /** Dias uteis ate hoje, inclusive. */
  elapsed: number
  /** Dias uteis de hoje ate o fim do mes, inclusive hoje. */
  remaining: number
}

/** Segunda a sexta, menos os feriados informados (AAAA-MM-DD, configurados por organizacao). */
export function businessDaysOfMonth(
  now: Date,
  holidays: readonly string[] = [],
  timeZone = BUSINESS_TIME_ZONE
): BusinessDays {
  const today = calendarDateIn(now, timeZone)
  const prefix = `${today.year}-${String(today.month).padStart(2, "0")}-`
  const off = new Set(holidays)
  let total = 0
  let elapsed = 0
  let remaining = 0

  for (let day = 1; day <= daysInMonth(today.year, today.month); day++) {
    if (!isWeekday({ ...today, day })) continue
    if (off.has(prefix + String(day).padStart(2, "0"))) continue
    total++
    if (day <= today.day) elapsed++
    if (day >= today.day) remaining++
  }

  return { total, elapsed, remaining }
}
