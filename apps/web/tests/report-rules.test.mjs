import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  advancedOpportunityIds,
  canCloseDay,
  dayNavigation,
  parseDayKey,
  resolveReportDay,
} from "../lib/report/rules.ts"

const today = { year: 2026, month: 11, day: 8 }

describe("dia do report", () => {
  it("le AAAA-MM-DD valido do calendario", () => {
    assert.deepEqual(parseDayKey("2026-02-28"), { year: 2026, month: 2, day: 28 })
    assert.equal(parseDayKey("2026-02-30"), null)
    assert.equal(parseDayKey("2026-13-01"), null)
    assert.equal(parseDayKey("08/11/2026"), null)
    assert.equal(parseDayKey(undefined), null)
  })

  it("ausente, invalido ou futuro vira hoje", () => {
    assert.deepEqual(resolveReportDay("2026-11-05", today), { year: 2026, month: 11, day: 5 })
    assert.deepEqual(resolveReportDay("2026-11-09", today), today)
    assert.deepEqual(resolveReportDay("lixo", today), today)
    assert.deepEqual(resolveReportDay(null, today), today)
  })

  it("navega entre dias sem passar de hoje, inclusive na virada do mes", () => {
    assert.deepEqual(dayNavigation(today, today), { previous: "2026-11-07", next: null })
    assert.deepEqual(dayNavigation({ year: 2026, month: 10, day: 31 }, today), {
      previous: "2026-10-30",
      next: "2026-11-01",
    })
  })
})

describe("fechamento", () => {
  it("fecha hoje ou um dia passado, uma unica vez", () => {
    assert.deepEqual(canCloseDay({ day: today, today, alreadyClosed: false }), { ok: true })
    assert.deepEqual(canCloseDay({ day: { year: 2026, month: 11, day: 3 }, today, alreadyClosed: false }), { ok: true })
    assert.equal(canCloseDay({ day: today, today, alreadyClosed: true }).status, 409)
    assert.equal(canCloseDay({ day: { year: 2026, month: 11, day: 9 }, today, alreadyClosed: false }).status, 422)
  })
})

describe("negociacoes avancadas", () => {
  const move = (opportunityId, fromPosition, toPosition, overrides = {}) => ({
    opportunityId,
    fromStatus: "OPEN",
    toStatus: "OPEN",
    fromPosition,
    toPosition,
    fromPipelineId: "p1",
    toPipelineId: "p1",
    ...overrides,
  })

  it("conta cada negociacao uma vez quando vai para etapa a frente", () => {
    assert.deepEqual(advancedOpportunityIds([move("a", 1, 2), move("a", 2, 3), move("b", 3, 2)]), ["a"])
  })

  it("ignora criacao, ganho, perda, reabertura e troca de funil", () => {
    assert.deepEqual(
      advancedOpportunityIds([
        move("criada", null, 1, { fromStatus: null }),
        move("ganha", 3, 4, { toStatus: "WON" }),
        move("perdida", 3, 4, { toStatus: "LOST" }),
        move("reaberta", 4, 4, { fromStatus: "WON" }),
        move("outro-funil", 1, 3, { toPipelineId: "p2" }),
      ]),
      []
    )
  })
})
