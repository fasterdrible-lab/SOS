import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { boardHref, ownerWhere, parseBoardFilters } from "../lib/opportunities/board.ts"
import { planOpportunityEdit } from "../lib/opportunities/rules.ts"

const current = {
  title: "Contrato",
  value: 1000,
  companyId: "a",
  contactId: null,
  ownerId: "ana",
  expectedClose: new Date("2026-12-01T00:00:00Z"),
  notes: null,
}
const plan = (next, extra = {}) =>
  planOpportunityEdit({
    current,
    next,
    status: "OPEN",
    requiredFields: [],
    canAssign: false,
    canEditClosed: false,
    ...extra,
  })

describe("edicao da negociacao", () => {
  it("devolve apenas o que mudou", () => {
    const result = plan({
      title: "Contrato",
      value: 1500,
      companyId: null,
      expectedClose: new Date("2026-12-01T00:00:00Z"),
      notes: undefined,
    })
    assert.equal(result.ok, true)
    assert.deepEqual(result.fields, ["value", "companyId"])
    assert.deepEqual(result.changes, { value: 1500, companyId: null })
  })

  it("sem mudanca nao exige permissao nenhuma", () => {
    const result = plan({ title: "Contrato", ownerId: "ana" }, { status: "WON" })
    assert.deepEqual(result, { ok: true, fields: [], changes: {} })
  })

  it("trocar o dono exige permissao", () => {
    assert.equal(plan({ ownerId: "bia" }).status, 403)
    assert.equal(plan({ ownerId: null }).status, 403)
    assert.deepEqual(plan({ ownerId: "bia" }, { canAssign: true }).fields, ["ownerId"])
  })

  it("nao apaga campo exigido pela etapa atual", () => {
    assert.deepEqual(plan({ companyId: null }, { requiredFields: ["companyId"] }), {
      ok: false,
      status: 422,
      error: "Esta etapa exige: Empresa.",
    })
    assert.equal(plan({ value: 0 }, { requiredFields: ["value"] }).status, 422)
    assert.equal(plan({ companyId: "b" }, { requiredFields: ["companyId"] }).ok, true)
    // Encerrada nao esta mais sujeita a etapa.
    assert.equal(
      plan({ companyId: null }, { status: "LOST", canEditClosed: true, requiredFields: ["companyId"] }).ok,
      true
    )
  })

  it("campo que ja faltava nao impede editar o resto", () => {
    assert.equal(plan({ title: "Novo" }, { requiredFields: ["contactId"] }).ok, true)
    assert.equal(plan({ contactId: "c" }, { requiredFields: ["contactId", "expectedClose"] }).ok, true)
  })

  it("ganha nao fica sem valor", () => {
    assert.deepEqual(plan({ value: 0 }, { status: "WON", canEditClosed: true }), {
      ok: false,
      status: 422,
      error: "Uma negociacao ganha precisa ter valor.",
    })
    assert.equal(plan({ value: 0 }, { status: "LOST", canEditClosed: true }).ok, true)
  })

  it("encerrada so e editada por quem pode reabrir", () => {
    assert.equal(plan({ value: 2000 }, { status: "WON" }).status, 403)
    assert.equal(plan({ value: 2000 }, { status: "WON", canEditClosed: true }).ok, true)
  })
})

describe("filtros do quadro", () => {
  it("usa os padroes para valores ausentes ou desconhecidos", () => {
    assert.deepEqual(parseBoardFilters({ status: "x", ordem: "y", visao: "z" }), {
      pipelineId: "",
      status: "abertas",
      sort: "recentes",
      view: "quadro",
      owner: "todos",
      query: "",
    })
  })

  it("le os filtros e normaliza o texto", () => {
    const filters = parseBoardFilters({
      funil: "f1",
      status: "ganhas",
      ordem: "valor",
      visao: "lista",
      dono: "meus",
      q: "  Acme   Brasil ",
    })
    assert.deepEqual(filters, {
      pipelineId: "f1",
      status: "ganhas",
      sort: "valor",
      view: "lista",
      owner: "meus",
      query: "Acme Brasil",
    })
  })

  it("monta a URL sem os valores padrao", () => {
    const base = parseBoardFilters({})
    assert.equal(boardHref(base), "/pipeline")
    assert.equal(boardHref(base, { sort: "valor", query: "a b" }), "/pipeline?ordem=valor&q=a+b")
    assert.equal(boardHref(parseBoardFilters({ funil: "f1", status: "todas" }), { view: "lista" }),
      "/pipeline?funil=f1&status=todas&visao=lista")
  })

  it("traduz o filtro de dono", () => {
    assert.deepEqual(ownerWhere("todos", "eu"), {})
    assert.deepEqual(ownerWhere("meus", "eu"), { ownerId: "eu" })
    assert.deepEqual(ownerWhere("sem-dono", "eu"), { ownerId: null })
    assert.deepEqual(ownerWhere("bia", "eu"), { ownerId: "bia" })
  })
})
