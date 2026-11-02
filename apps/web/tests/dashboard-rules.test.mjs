import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  averageCycleDays,
  buildFunnel,
  buildTeamRows,
  rankGroups,
} from "../lib/dashboard/metrics.ts"
import { eachDay, parsePeriod, percentChange, periodWindow } from "../lib/dashboard/period.ts"

const day = (text) => {
  const [year, month, dayOfMonth] = text.split("-").map(Number)
  return { year, month, day: dayOfMonth }
}
const text = ({ year, month, day: d }) =>
  `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
const range = ({ start, end }) => [text(start), text(end)]

describe("periodos do dashboard", () => {
  it("periodo desconhecido vira o mes corrente", () => {
    assert.equal(parsePeriod(undefined), "mes")
    assert.equal(parsePeriod("semana"), "mes")
    assert.equal(parsePeriod("90-dias"), "90-dias")
  })

  it("este mes vai do dia 1 a hoje, contra os mesmos dias do mes anterior", () => {
    const window = periodWindow("mes", day("2026-11-10"))
    assert.deepEqual(range(window.current), ["2026-11-01", "2026-11-11"])
    assert.deepEqual(range(window.previous), ["2026-10-01", "2026-10-11"])
  })

  it("no dia 31, o mes anterior mais curto entra inteiro", () => {
    const window = periodWindow("mes", day("2026-03-31"))
    assert.deepEqual(range(window.previous), ["2026-02-01", "2026-03-01"])
  })

  it("mes anterior em janeiro volta para dezembro e novembro", () => {
    const window = periodWindow("mes-anterior", day("2027-01-15"))
    assert.deepEqual(range(window.current), ["2026-12-01", "2027-01-01"])
    assert.deepEqual(range(window.previous), ["2026-11-01", "2026-12-01"])
  })

  it("ultimos 90 dias incluem hoje e comparam com os 90 anteriores", () => {
    const window = periodWindow("90-dias", day("2026-11-02"))
    assert.equal(eachDay(window.current).length, 90)
    assert.equal(eachDay(window.previous).length, 90)
    assert.equal(text(window.current.end), "2026-11-03")
    assert.equal(text(window.previous.end), text(window.current.start))
  })

  it("este ano compara com o mesmo trecho do ano anterior", () => {
    const window = periodWindow("ano", day("2026-11-02"))
    assert.deepEqual(range(window.current), ["2026-01-01", "2026-11-03"])
    assert.deepEqual(range(window.previous), ["2025-01-01", "2025-11-03"])
  })

  it("variacao sem base e nula", () => {
    assert.equal(percentChange(10, 0), null)
    assert.equal(percentChange(150, 100), 50)
    assert.equal(percentChange(81.4, 100), -18.6)
  })
})

describe("funil", () => {
  it("conta a etapa mais alta alcancada e as anteriores", () => {
    const steps = buildFunnel([
      { opportunityId: "a", toStage: "PROSPECTING" },
      { opportunityId: "a", toStage: "PROPOSAL" },
      { opportunityId: "b", toStage: "PROSPECTING" },
      // Pulou direto para o ganho.
      { opportunityId: "c", toStage: "CLOSED_WON" },
      { opportunityId: "d", toStage: "CLOSED_LOST" },
    ])
    assert.deepEqual(
      steps.map((step) => [step.stage, step.count, step.percentOfPrevious]),
      [
        ["PROSPECTING", 3, null],
        ["QUALIFICATION", 2, 66.7],
        ["PROPOSAL", 2, 100],
        ["NEGOTIATION", 1, 50],
        ["CLOSED_WON", 1, 100],
      ]
    )
  })

  it("periodo sem movimento nao divide por zero", () => {
    assert.ok(buildFunnel([]).every((step) => step.count === 0 && step.percentOfPrevious === null))
  })
})

describe("origens e motivos", () => {
  it("agrupa texto livre sem diferenciar maiusculas e soma os demais", () => {
    const ranked = rankGroups(
      [
        { key: "Preço", value: 100 },
        { key: " preço ", value: 50 },
        { key: "Concorrente", value: 10 },
        { key: null, value: 5 },
        { key: "Prazo", value: 1 },
        { key: "Sem verba", value: 1 },
      ],
      { top: 2, emptyLabel: "Sem motivo" }
    )
    assert.deepEqual(ranked.total, { count: 6, value: 167 })
    assert.deepEqual(
      ranked.groups.map((group) => [group.label, group.count, group.value, group.share]),
      [
        ["Preço", 2, 150, 33.3],
        ["Concorrente", 1, 10, 16.7],
      ]
    )
    assert.deepEqual(ranked.others, { groupCount: 3, count: 3, value: 7, share: 50 })
  })

  it("sem itens nao ha grupos", () => {
    assert.deepEqual(rankGroups([], { top: 3, emptyLabel: "x" }), {
      total: { count: 0, value: 0 },
      groups: [],
      others: null,
    })
  })
})

describe("time", () => {
  it("calcula vendas, conversao, ticket e meta por dono", () => {
    const rows = buildTeamRows({
      members: [
        { userId: "ana", name: "Ana" },
        { userId: "bia", name: "Bia" },
        { userId: "caio", name: "Caio" },
      ],
      won: [
        { ownerId: "ana", value: 1000 },
        { ownerId: "ana", value: 500 },
        { ownerId: null, value: 200 },
      ],
      lost: [{ ownerId: "ana" }, { ownerId: "bia" }],
      monthRevenue: new Map([["ana", 1500]]),
      goals: new Map([["ana", 3000], ["caio", 1000]]),
    })

    assert.deepEqual(
      rows.map((row) => [row.name, row.won, row.lost, row.revenue, row.averageTicket, row.conversionRate, row.goalPercent]),
      [
        ["Ana", 2, 1, 1500, 750, 66.7, 50],
        ["Sem responsável", 1, 0, 200, 200, 100, null],
        ["Bia", 0, 1, 0, null, 0, null],
        ["Caio", 0, 0, 0, null, null, 0],
      ]
    )
  })
})

describe("ciclo de venda", () => {
  it("media de dias da criacao ao ganho", () => {
    const at = (iso) => new Date(iso)
    assert.equal(averageCycleDays([]), null)
    assert.equal(
      averageCycleDays([
        { createdAt: at("2026-10-01T00:00:00Z"), wonAt: at("2026-10-11T00:00:00Z") },
        { createdAt: at("2026-10-01T00:00:00Z"), wonAt: at("2026-10-06T12:00:00Z") },
      ]),
      7.8
    )
  })
})
