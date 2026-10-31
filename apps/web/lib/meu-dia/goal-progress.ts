import type { BusinessDays } from "@/lib/time/business-calendar"

export interface GoalProgress {
  goal: number | null
  revenue: number
  /** Percentual atingido; nulo sem meta. */
  percent: number | null
  remaining: number | null
  /** Quanto ja deveria ter sido faturado, proporcional aos dias uteis. */
  idealToDate: number | null
  /** Positivo: atras do ideal. Negativo: a frente. */
  gapToIdeal: number | null
  /** Faturamento no ritmo atual ate o fim do mes. */
  projection: number | null
  /** Faturamento por dia util necessario para bater a meta. */
  dailyNeeded: number | null
  businessDays: BusinessDays
}

const round2 = (value: number) => Math.round(value * 100) / 100

export function computeGoalProgress(input: {
  goal: number | null
  revenue: number
  businessDays: BusinessDays
}): GoalProgress {
  const { revenue, businessDays } = input
  const goal = input.goal && input.goal > 0 ? input.goal : null
  const { total, elapsed, remaining: daysLeft } = businessDays

  const projection = elapsed > 0 && total > 0 ? round2((revenue / elapsed) * total) : null

  if (goal === null) {
    return {
      goal: null,
      revenue,
      percent: null,
      remaining: null,
      idealToDate: null,
      gapToIdeal: null,
      projection,
      dailyNeeded: null,
      businessDays,
    }
  }

  const remaining = round2(Math.max(goal - revenue, 0))
  const idealToDate = total > 0 ? round2((goal * elapsed) / total) : null

  return {
    goal,
    revenue,
    percent: round2((revenue / goal) * 100),
    remaining,
    idealToDate,
    gapToIdeal: idealToDate === null ? null : round2(idealToDate - revenue),
    projection,
    dailyNeeded: remaining > 0 && daysLeft > 0 ? round2(remaining / daysLeft) : null,
    businessDays,
  }
}

/** Ganhas sobre encerradas (ganhas + perdidas) no periodo. */
export function conversionRate(won: number, lost: number): number | null {
  const closed = won + lost
  return closed === 0 ? null : round2((won / closed) * 100)
}

export function averageTicket(revenue: number, won: number): number | null {
  return won === 0 ? null : round2(revenue / won)
}
