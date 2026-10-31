import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  averageTicket,
  computeGoalProgress,
  conversionRate,
} from "../lib/meu-dia/goal-progress.ts"
import {
  businessDaysOfMonth,
  calendarDateIn,
  dayRange,
  monthKey,
  monthRange,
} from "../lib/time/business-calendar.ts"

describe("calendario no fuso de Brasilia", () => {
  it("venda as 22h de 31/10 em Brasilia (01h UTC de 1/11) e de outubro", () => {
    const instant = new Date("2026-11-01T01:00:00Z")
    assert.deepEqual(calendarDateIn(instant), { year: 2026, month: 10, day: 31 })
    assert.equal(monthKey(instant), "2026-10")
  })

  it("dia comeca a meia-noite de Brasilia (03h UTC)", () => {
    const { start, end } = dayRange(new Date("2026-10-31T15:00:00Z"))
    assert.equal(start.toISOString(), "2026-10-31T03:00:00.000Z")
    assert.equal(end.toISOString(), "2026-11-01T03:00:00.000Z")
  })

  it("mes de outubro vai de 1/10 03h UTC a 1/11 03h UTC", () => {
    const { start, end } = monthRange(new Date("2026-10-15T12:00:00Z"))
    assert.equal(start.toISOString(), "2026-10-01T03:00:00.000Z")
    assert.equal(end.toISOString(), "2026-11-01T03:00:00.000Z")
  })

  it("virada de ano", () => {
    const { start, end } = monthRange(new Date("2026-12-31T23:00:00Z"))
    assert.equal(start.toISOString(), "2026-12-01T03:00:00.000Z")
    assert.equal(end.toISOString(), "2027-01-01T03:00:00.000Z")
    assert.equal(monthKey(new Date("2027-01-01T02:59:00Z")), "2026-12")
    assert.equal(monthKey(new Date("2027-01-01T03:00:00Z")), "2027-01")
  })

  it("conta dias uteis de segunda a sexta", () => {
    // Outubro de 2026: 22 dias uteis; dia 23 (sexta) e o 17o.
    assert.deepEqual(businessDaysOfMonth(new Date("2026-10-23T15:00:00Z")), {
      total: 22,
      elapsed: 17,
      remaining: 6,
    })
    // Sabado 31/10: todos decorridos, nenhum restante.
    assert.deepEqual(businessDaysOfMonth(new Date("2026-10-31T15:00:00Z")), {
      total: 22,
      elapsed: 22,
      remaining: 0,
    })
  })
})

describe("progresso da meta", () => {
  const businessDays = { total: 20, elapsed: 10, remaining: 11 }

  it("calcula percentual, restante, ideal, projecao e ritmo necessario", () => {
    assert.deepEqual(computeGoalProgress({ goal: 100000, revenue: 40000, businessDays }), {
      goal: 100000,
      revenue: 40000,
      percent: 40,
      remaining: 60000,
      idealToDate: 50000,
      gapToIdeal: 10000,
      projection: 80000,
      dailyNeeded: 5454.55,
      businessDays,
    })
  })

  it("meta batida nao tem restante nem ritmo necessario", () => {
    const result = computeGoalProgress({ goal: 1000, revenue: 1500, businessDays })
    assert.equal(result.percent, 150)
    assert.equal(result.remaining, 0)
    assert.equal(result.dailyNeeded, null)
    assert.equal(result.gapToIdeal, -1000)
  })

  it("sem meta mostra so faturamento e projecao", () => {
    for (const goal of [null, 0]) {
      const result = computeGoalProgress({ goal, revenue: 500, businessDays })
      assert.equal(result.goal, null)
      assert.equal(result.percent, null)
      assert.equal(result.remaining, null)
      assert.equal(result.projection, 1000)
    }
  })

  it("antes do primeiro dia util nao projeta", () => {
    const result = computeGoalProgress({
      goal: 1000,
      revenue: 0,
      businessDays: { total: 21, elapsed: 0, remaining: 21 },
    })
    assert.equal(result.projection, null)
    assert.equal(result.idealToDate, 0)
  })
})

describe("indicadores", () => {
  it("conversao e ganhas sobre encerradas", () => {
    assert.equal(conversionRate(3, 1), 75)
    assert.equal(conversionRate(0, 0), null)
  })

  it("ticket medio e faturamento sobre vendas", () => {
    assert.equal(averageTicket(1000, 3), 333.33)
    assert.equal(averageTicket(0, 0), null)
  })
})
