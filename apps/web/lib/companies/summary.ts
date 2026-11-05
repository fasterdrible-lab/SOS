// Indicadores da visao 360 da empresa. Regra pura: a consulta fica em overview.ts.

const round1 = (value: number) => Math.round(value * 10) / 10
const round2 = (value: number) => Math.round(value * 100) / 100

export interface CompanySummary {
  open: { count: number; value: number }
  won: { count: number; value: number }
  lostCount: number
  averageTicket: number | null
  /** Ganhas sobre encerradas; nulo sem nenhuma encerrada. */
  winRate: number | null
  /** Ultima mudanca de etapa ou status; nula sem negociacoes. */
  lastMovementAt: Date | null
}

export function summarizeOpportunities(
  rows: { value: number; status: string; stageChangedAt: Date }[]
): CompanySummary {
  const sum = (status: string) =>
    rows.filter((row) => row.status === status).reduce((total, row) => total + row.value, 0)
  const count = (status: string) => rows.filter((row) => row.status === status).length

  const wonCount = count("WON")
  const lostCount = count("LOST")
  const wonValue = round2(sum("WON"))
  const closed = wonCount + lostCount
  const latest = Math.max(...rows.map((row) => row.stageChangedAt.getTime()))

  return {
    open: { count: count("OPEN"), value: round2(sum("OPEN")) },
    won: { count: wonCount, value: wonValue },
    lostCount,
    averageTicket: wonCount === 0 ? null : round2(wonValue / wonCount),
    winRate: closed === 0 ? null : round1((wonCount / closed) * 100),
    lastMovementAt: rows.length === 0 ? null : new Date(latest),
  }
}
