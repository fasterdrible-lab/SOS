import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { boardHref, ownerWhere, parseBoardFilters } from "../lib/opportunities/board.ts"
import { planOpportunityEdit } from "../lib/opportunities/edit.ts"

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
  planOpportunityEdit({ current, next, closed: false, canAssign: false, canEditClosed: false, ...extra })

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
    const result = plan({ title: "Contrato", ownerId: "ana" }, { closed: true })
    assert.deepEqual(result, { ok: true, fields: [], changes: {} })
  })

  it("trocar o dono exige permissao", () => {
    assert.equal(plan({ ownerId: "bia" }).status, 403)
    assert.equal(plan({ ownerId: null }).status, 403)
    assert.deepEqual(plan({ ownerId: "bia" }, { canAssign: true }).fields, ["ownerId"])
  })

  it("encerrada so e editada por quem pode reabrir", () => {
    assert.equal(plan({ value: 2000 }, { closed: true }).status, 403)
    assert.equal(plan({ value: 2000 }, { closed: true, canEditClosed: true }).ok, true)
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
