import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { summarizeOpportunities } from "../lib/companies/summary.ts"
import { describeHistoryChange } from "../lib/opportunities/rules.ts"

describe("indicadores da empresa", () => {
  const at = (day) => new Date(`2026-10-${day}T12:00:00Z`)

  it("sem negociacoes, nada a calcular", () => {
    assert.deepEqual(summarizeOpportunities([]), {
      open: { count: 0, value: 0 },
      won: { count: 0, value: 0 },
      lostCount: 0,
      averageTicket: null,
      winRate: null,
      lastMovementAt: null,
    })
  })

  it("soma por status, sem misturar perdidas no faturado", () => {
    const summary = summarizeOpportunities([
      { value: 1000.1, status: "WON", stageChangedAt: at("10") },
      { value: 2000.2, status: "WON", stageChangedAt: at("12") },
      { value: 700, status: "LOST", stageChangedAt: at("11") },
      { value: 500, status: "OPEN", stageChangedAt: at("20") },
      { value: 250.5, status: "OPEN", stageChangedAt: at("05") },
    ])
    assert.deepEqual(summary.won, { count: 2, value: 3000.3 })
    assert.deepEqual(summary.open, { count: 2, value: 750.5 })
    assert.equal(summary.lostCount, 1)
    assert.equal(summary.averageTicket, 1500.15)
    assert.equal(summary.winRate, 66.7)
    assert.equal(summary.lastMovementAt.getTime(), at("20").getTime())
  })

  it("so abertas nao tem taxa de ganho nem ticket", () => {
    const summary = summarizeOpportunities([{ value: 10, status: "OPEN", stageChangedAt: at("01") }])
    assert.equal(summary.winRate, null)
    assert.equal(summary.averageTicket, null)
  })
})

describe("texto do historico", () => {
  const entry = (fromStatus, toStatus, fromStageName, toStageName) => ({ fromStatus, toStatus, fromStageName, toStageName })

  it("descreve cada tipo de mudanca", () => {
    assert.equal(describeHistoryChange(entry(null, "OPEN", null, "Prospecção")), "Criada em Prospecção")
    assert.equal(describeHistoryChange(entry("OPEN", "OPEN", "Prospecção", "Proposta")), "Prospecção → Proposta")
    assert.equal(describeHistoryChange(entry("OPEN", "WON", "Proposta", "Proposta")), "Ganha em Proposta")
    assert.equal(describeHistoryChange(entry("OPEN", "LOST", "Proposta", "Proposta")), "Perdida em Proposta")
    assert.equal(describeHistoryChange(entry("WON", "OPEN", "Proposta", "Negociação")), "Reaberta em Negociação")
  })
})
