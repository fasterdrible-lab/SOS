import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { planOpportunityChange, resolveOpportunityLinks } from "../lib/opportunities/rules.ts"
import { planStageEdits } from "../lib/pipelines/edit.ts"

const now = new Date("2026-10-31T15:00:00Z")
const stage = (id, probability, extra = {}) => ({ id, pipelineId: "vendas", probability, archived: false, ...extra })
const PROSPECCAO = stage("prospeccao", 10)
const PROPOSTA = stage("proposta", 50)
const NEGOCIACAO = stage("negociacao", 75)

const plan = (current, change = {}) =>
  planOpportunityChange({ current, canReopen: false, now, ...change })
const open = (at = PROSPECCAO) => ({ status: "OPEN", stage: at })
const closed = (status, at = NEGOCIACAO) => ({ status, stage: at })

describe("mudanca de etapa", () => {
  it("nao altera nada sem mudanca", () => {
    assert.deepEqual(plan(open(), { targetStage: PROSPECCAO }), { ok: true, unchanged: true })
    assert.deepEqual(plan(closed("WON"), { targetStatus: "WON" }), { ok: true, unchanged: true })
  })

  it("avanca entre etapas com a probabilidade da etapa", () => {
    const result = plan(open(), { targetStage: PROPOSTA })
    assert.equal(result.ok, true)
    assert.deepEqual(result.data, {
      pipelineId: "vendas",
      stageId: "proposta",
      status: "OPEN",
      probability: 50,
      wonAt: null,
      lostAt: null,
      lostReason: null,
      stageChangedAt: now,
    })
  })

  it("aceita etapa de outro funil e leva a negociacao junto", () => {
    const result = plan(open(), { targetStage: stage("inside-1", 20, { pipelineId: "inside" }) })
    assert.equal(result.data.pipelineId, "inside")
    assert.equal(result.data.stageId, "inside-1")
  })

  it("recusa etapa removida do funil", () => {
    const result = plan(open(), { targetStage: stage("velha", 30, { archived: true }) })
    assert.deepEqual(result, { ok: false, status: 422, error: "Esta etapa foi removida do funil." })
  })
})

describe("ganho e perda", () => {
  it("ganhar registra a data real e 100%, sem sair da etapa", () => {
    const result = plan(open(PROPOSTA), { targetStatus: "WON" })
    assert.equal(result.data.status, "WON")
    assert.equal(result.data.stageId, "proposta")
    assert.equal(result.data.wonAt, now)
    assert.equal(result.data.lostAt, null)
    assert.equal(result.data.probability, 100)
  })

  it("exige motivo para perder", () => {
    for (const lostReason of [undefined, null, "", "  ", "ab"]) {
      const result = plan(open(PROPOSTA), { targetStatus: "LOST", lostReason })
      assert.deepEqual(result, { ok: false, status: 422, error: "Informe o motivo da perda." })
    }
  })

  it("perder registra motivo, data e 0%", () => {
    const result = plan(open(PROPOSTA), { targetStatus: "LOST", lostReason: "  Preco acima do orcamento " })
    assert.equal(result.data.lostReason, "Preco acima do orcamento")
    assert.equal(result.data.lostAt, now)
    assert.equal(result.data.wonAt, null)
    assert.equal(result.data.probability, 0)
  })

  it("ignora motivo de perda fora da perda", () => {
    assert.equal(plan(open(), { targetStage: PROPOSTA, lostReason: "x" }).data.lostReason, null)
  })

  it("pode mover e ganhar de uma vez", () => {
    const result = plan(open(), { targetStage: NEGOCIACAO, targetStatus: "WON" })
    assert.equal(result.data.stageId, "negociacao")
    assert.equal(result.data.status, "WON")
  })
})

describe("negociacao encerrada", () => {
  it("so gestor ou administrador reabre", () => {
    for (const status of ["WON", "LOST"]) {
      const denied = plan(closed(status), { targetStatus: "OPEN" })
      assert.equal(denied.ok, false)
      assert.equal(denied.status, 403)

      const reopened = plan(closed(status), { targetStatus: "OPEN", canReopen: true })
      assert.equal(reopened.ok, true)
      assert.equal(reopened.data.probability, 75)
      assert.equal(reopened.data.wonAt, null)
      assert.equal(reopened.data.lostAt, null)
      assert.equal(reopened.data.lostReason, null)
    }
  })

  it("trocar de ganho para perda tambem exige permissao e motivo", () => {
    assert.equal(plan(closed("WON"), { targetStatus: "LOST", lostReason: "Cancelou" }).status, 403)
    assert.equal(
      plan(closed("WON"), { targetStatus: "LOST", canReopen: true }).error,
      "Informe o motivo da perda."
    )
  })

  it("nao muda de etapa enquanto encerrada", () => {
    const result = plan(closed("WON"), { targetStage: PROPOSTA, canReopen: true })
    assert.deepEqual(result, { ok: false, status: 422, error: "Reabra a negociacao para mudar de etapa." })
  })

  it("nao reabre na etapa removida; precisa escolher uma ativa", () => {
    const removed = stage("velha", 30, { archived: true })
    const sameStage = plan(closed("WON", removed), { targetStatus: "OPEN", canReopen: true })
    assert.deepEqual(sameStage, { ok: false, status: 422, error: "Esta etapa foi removida do funil." })

    const elsewhere = plan(closed("WON", removed), { targetStatus: "OPEN", targetStage: PROPOSTA, canReopen: true })
    assert.equal(elsewhere.ok, true)
    assert.equal(elsewhere.data.stageId, "proposta")

    // Trocar o resultado sem reabrir continua possivel.
    const switched = plan(closed("WON", removed), { targetStatus: "LOST", lostReason: "Cancelou", canReopen: true })
    assert.equal(switched.ok, true)
  })

  it("reabrir pode levar a outra etapa", () => {
    const result = plan(closed("LOST"), { targetStage: PROPOSTA, targetStatus: "OPEN", canReopen: true })
    assert.equal(result.data.stageId, "proposta")
    assert.equal(result.data.probability, 50)
  })
})

describe("edicao das etapas do funil", () => {
  const existing = [
    { id: "a", openCount: 0 },
    { id: "b", openCount: 2 },
    { id: "c", openCount: 0 },
  ]
  const incoming = (...stages) => stages.map(([id, name]) => ({ id, name, probability: 10, isProposal: false }))

  it("reordena, cria e arquiva etapas sem negociacoes em andamento", () => {
    const result = planStageEdits(existing, incoming(["b", " Proposta "], [undefined, "Nova"], ["a", "Contato"]))
    assert.equal(result.ok, true)
    assert.deepEqual(
      result.upserts.map((stage) => [stage.id, stage.name, stage.position]),
      [["b", "Proposta", 1], [undefined, "Nova", 2], ["a", "Contato", 3]]
    )
    assert.deepEqual(result.archive, ["c"])
  })

  it("nao remove etapa com negociacoes em andamento", () => {
    const result = planStageEdits(existing, incoming(["a", "Contato"], ["c", "Fim"]))
    assert.equal(result.ok, false)
    assert.equal(result.status, 409)
  })

  it("recusa funil vazio, etapa repetida, alheia ou com nome duplicado", () => {
    assert.equal(planStageEdits(existing, []).status, 422)
    assert.equal(planStageEdits(existing, incoming(["a", "X"], ["a", "Y"], ["b", "Z"])).status, 422)
    assert.equal(planStageEdits(existing, incoming(["zz", "X"], ["b", "Y"])).status, 404)
    assert.equal(planStageEdits(existing, incoming(["a", "Igual"], ["b", "igual"], ["c", "Z"])).status, 422)
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
