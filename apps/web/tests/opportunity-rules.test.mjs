import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  STAGE_PROBABILITY,
  isClosedStage,
  planStageTransition,
  resolveOpportunityLinks,
} from "../lib/opportunities/rules.ts"

const now = new Date("2026-10-31T15:00:00Z")
const plan = (from, to, extra = {}) =>
  planStageTransition({ from, to, canReopen: false, now, ...extra })

describe("transicoes de etapa", () => {
  it("nao altera nada quando a etapa e a mesma", () => {
    assert.deepEqual(plan("CLOSED_WON", "CLOSED_WON"), { ok: true, unchanged: true })
  })

  it("avanca entre etapas abertas com a probabilidade da etapa", () => {
    const result = plan("PROSPECTING", "PROPOSAL")
    assert.equal(result.ok, true)
    assert.deepEqual(result.data, {
      stage: "PROPOSAL",
      probability: 50,
      wonAt: null,
      lostAt: null,
      lostReason: null,
      stageChangedAt: now,
    })
  })

  it("registra a data real do ganho", () => {
    const result = plan("NEGOTIATION", "CLOSED_WON")
    assert.equal(result.data.wonAt, now)
    assert.equal(result.data.lostAt, null)
    assert.equal(result.data.probability, 100)
  })

  it("exige motivo para perder", () => {
    for (const lostReason of [undefined, null, "", "  ", "ab"]) {
      const result = plan("PROPOSAL", "CLOSED_LOST", { lostReason })
      assert.deepEqual(result, { ok: false, status: 422, error: "Informe o motivo da perda." })
    }
  })

  it("registra perda com motivo, data e probabilidade zero", () => {
    const result = plan("PROPOSAL", "CLOSED_LOST", { lostReason: "  Preco acima do orcamento " })
    assert.equal(result.data.lostReason, "Preco acima do orcamento")
    assert.equal(result.data.lostAt, now)
    assert.equal(result.data.wonAt, null)
    assert.equal(result.data.probability, 0)
  })

  it("ignora motivo de perda em outras etapas", () => {
    assert.equal(plan("PROSPECTING", "QUALIFICATION", { lostReason: "x" }).data.lostReason, null)
  })

  it("so gestor ou administrador reabre negociacao encerrada", () => {
    for (const from of ["CLOSED_WON", "CLOSED_LOST"]) {
      const denied = plan(from, "NEGOTIATION")
      assert.equal(denied.ok, false)
      assert.equal(denied.status, 403)

      const reopened = plan(from, "NEGOTIATION", { canReopen: true })
      assert.equal(reopened.ok, true)
      assert.equal(reopened.data.wonAt, null)
      assert.equal(reopened.data.lostAt, null)
      assert.equal(reopened.data.lostReason, null)
    }
  })

  it("trocar de ganho para perda tambem e reabertura", () => {
    assert.equal(plan("CLOSED_WON", "CLOSED_LOST", { lostReason: "Cancelou" }).status, 403)
  })
})

describe("probabilidades", () => {
  it("crescem com o funil e fecham em 100 ou 0", () => {
    const open = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION"].map(
      (stage) => STAGE_PROBABILITY[stage]
    )
    assert.deepEqual(open, [...open].sort((a, b) => a - b))
    assert.equal(STAGE_PROBABILITY.CLOSED_WON, 100)
    assert.equal(STAGE_PROBABILITY.CLOSED_LOST, 0)
    assert.equal(isClosedStage("CLOSED_LOST"), true)
    assert.equal(isClosedStage("NEGOTIATION"), false)
  })
})

describe("vinculo entre contato e empresa", () => {
  it("rejeita contato de outra empresa", () => {
    assert.deepEqual(
      resolveOpportunityLinks({ companyId: "a", contact: { companyId: "b" } }),
      { ok: false, error: "O contato pertence a outra empresa." }
    )
  })

  it("aceita contato da mesma empresa ou sem empresa", () => {
    assert.deepEqual(resolveOpportunityLinks({ companyId: "a", contact: { companyId: "a" } }), {
      ok: true,
      companyId: "a",
    })
    assert.deepEqual(resolveOpportunityLinks({ companyId: "a", contact: { companyId: null } }), {
      ok: true,
      companyId: "a",
    })
  })

  it("herda a empresa do contato quando nenhuma e informada", () => {
    assert.deepEqual(resolveOpportunityLinks({ companyId: null, contact: { companyId: "b" } }), {
      ok: true,
      companyId: "b",
    })
    assert.deepEqual(resolveOpportunityLinks({ companyId: null, contact: null }), {
      ok: true,
      companyId: null,
    })
  })
})
