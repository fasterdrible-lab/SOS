import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { buildNotifications } from "../lib/notifications/build.ts"
import { SEARCH_MAX_LENGTH, normalizeSearchTerm } from "../lib/search/query.ts"
import { parseTheme } from "../lib/theme.ts"

describe("notificacoes do cabecalho", () => {
  it("sem pendencias, nada a mostrar", () => {
    assert.deepEqual(
      buildNotifications({ hotLeads: 0, overdueTasks: 0, overdueActivities: 0, overdueClose: 0, cooling: 0 }),
      { total: 0, items: [] }
    )
  })

  it("lista apenas o que tem pendencia e soma o total", () => {
    const { total, items } = buildNotifications({ hotLeads: 2, overdueTasks: 0, overdueActivities: 0, overdueClose: 1, cooling: 3 })
    assert.equal(total, 6)
    assert.deepEqual(items.map((item) => item.kind), ["hot-leads", "overdue-close", "cooling"])
    assert.deepEqual(items.map((item) => item.href), ["/sdr", "/meu-dia", "/meu-dia"])
  })

  it("papel sem IA SDR nao recebe leads", () => {
    const { items } = buildNotifications({ hotLeads: null, overdueTasks: 1, overdueActivities: 0, overdueClose: 0, cooling: 0 })
    assert.deepEqual(items.map((item) => item.kind), ["overdue-tasks"])
  })

  it("usa singular e plural", () => {
    const one = buildNotifications({ hotLeads: 1, overdueTasks: 1, overdueActivities: 1, overdueClose: 1, cooling: 1 })
    assert.deepEqual(one.items.map((item) => item.title), [
      "1 lead qualificado pelo IA SDR",
      "1 atividade atrasada",
      "1 tarefa de plano atrasada",
      "1 negociação com fechamento vencido",
      "1 negociação esfriando",
    ])
    const many = buildNotifications({ hotLeads: 0, overdueTasks: 4, overdueActivities: 0, overdueClose: 0, cooling: 2 })
    assert.deepEqual(many.items.map((item) => item.title), ["4 tarefas de plano atrasadas", "2 negociações esfriando"])
  })
})

describe("termo da busca global", () => {
  it("exige ao menos 2 caracteres uteis", () => {
    assert.equal(normalizeSearchTerm(null), null)
    assert.equal(normalizeSearchTerm(""), null)
    assert.equal(normalizeSearchTerm("  a  "), null)
    assert.equal(normalizeSearchTerm("ab"), "ab")
  })

  it("remove espacos repetidos e das pontas", () => {
    assert.equal(normalizeSearchTerm("  Acme   Brasil \n"), "Acme Brasil")
  })

  it("limita o tamanho", () => {
    assert.equal(normalizeSearchTerm("x".repeat(500)).length, SEARCH_MAX_LENGTH)
  })
})

describe("tema", () => {
  it("escuro por padrao; claro so quando escolhido", () => {
    assert.equal(parseTheme(undefined), "dark")
    assert.equal(parseTheme("qualquer"), "dark")
    assert.equal(parseTheme("dark"), "dark")
    assert.equal(parseTheme("light"), "light")
  })
})
