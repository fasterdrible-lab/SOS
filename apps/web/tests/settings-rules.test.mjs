import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  changedSettings,
  DEFAULT_COMMERCIAL_SETTINGS,
  isCalendarDay,
  normalizeHolidays,
} from "../lib/settings/rules.ts"
import { businessDaysOfMonth } from "../lib/time/business-calendar.ts"

describe("configuracoes comerciais (V2-9.3)", () => {
  it("padrao: 14 dias para esfriar e nenhum feriado", () => {
    assert.deepEqual(DEFAULT_COMMERCIAL_SETTINGS, { coolingAfterDays: 14, holidays: [] })
  })

  it("feriado precisa ser um dia que existe, em AAAA-MM-DD", () => {
    assert.equal(isCalendarDay("2026-12-25"), true)
    assert.equal(isCalendarDay("2028-02-29"), true)
    for (const value of ["2026-02-30", "2026-13-01", "25/12/2026", "2026-1-5", "", "2026-12-25T00:00"]) {
      assert.equal(isCalendarDay(value), false, value)
    }
  })

  it("feriados ficam sem repetidos e em ordem", () => {
    assert.deepEqual(normalizeHolidays(["2026-12-25", "2026-11-20", "2026-12-25"]), ["2026-11-20", "2026-12-25"])
  })

  it("a auditoria recebe so os nomes dos campos que mudaram", () => {
    const before = { coolingAfterDays: 14, holidays: ["2026-12-25"] }
    assert.deepEqual(changedSettings(before, { ...before }), [])
    assert.deepEqual(changedSettings(before, { ...before, coolingAfterDays: 7 }), ["coolingAfterDays"])
    assert.deepEqual(changedSettings(before, { coolingAfterDays: 7, holidays: [] }), ["coolingAfterDays", "holidays"])
  })
})

describe("dias uteis com feriados (V2-9.3)", () => {
  // Outubro de 2026: 22 dias uteis; dia 23 e sexta, o 17o dia util.
  const now = new Date("2026-10-23T15:00:00Z")

  it("feriado em dia de semana sai do total, do decorrido e do restante", () => {
    assert.deepEqual(businessDaysOfMonth(now), { total: 22, elapsed: 17, remaining: 6 })
    // Dia 12 (segunda, ja passou) e dia 28 (quarta, ainda vem).
    assert.deepEqual(businessDaysOfMonth(now, ["2026-10-12", "2026-10-28"]), { total: 20, elapsed: 16, remaining: 5 })
  })

  it("hoje feriado nao conta como dia util", () => {
    assert.deepEqual(businessDaysOfMonth(now, ["2026-10-23"]), { total: 21, elapsed: 16, remaining: 5 })
  })

  it("feriado no fim de semana ou em outro mes nao muda nada", () => {
    assert.deepEqual(businessDaysOfMonth(now, ["2026-10-24", "2026-11-02", "2025-10-12"]), {
      total: 22,
      elapsed: 17,
      remaining: 6,
    })
  })
})
