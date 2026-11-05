import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  activitiesHref,
  activityBucket,
  completesOnCreate,
  parseActivityFilters,
  requiresDueDate,
  resolveActivityLinks,
} from "../lib/activities/rules.ts"
import { dayKey, weekDays } from "../lib/dashboard/period.ts"

const today = { start: new Date("2026-11-05T03:00:00Z"), end: new Date("2026-11-06T03:00:00Z") }
const at = (iso) => (iso ? new Date(iso) : null)

describe("grupos de atividades", () => {
  const bucket = (dueDate, completedAt = null) =>
    activityBucket({ dueDate: at(dueDate), completedAt: at(completedAt) }, today)

  it("separa por data no dia de Brasilia", () => {
    assert.equal(bucket("2026-11-05T02:59:00Z"), "overdue")
    assert.equal(bucket("2026-11-05T03:00:00Z"), "today")
    assert.equal(bucket("2026-11-06T02:59:00Z"), "today")
    assert.equal(bucket("2026-11-06T03:00:00Z"), "upcoming")
    assert.equal(bucket(null), "unscheduled")
  })

  it("concluida sai dos demais grupos", () => {
    assert.equal(bucket("2026-11-01T12:00:00Z", "2026-11-02T12:00:00Z"), "done")
  })
})

describe("regras por tipo", () => {
  it("reuniao e follow-up exigem data", () => {
    assert.deepEqual(
      ["MEETING", "FOLLOW_UP", "CALL", "EMAIL", "TASK", "NOTE"].filter(requiresDueDate),
      ["MEETING", "FOLLOW_UP"]
    )
  })

  it("nota ja nasce concluida", () => {
    assert.equal(completesOnCreate("NOTE"), true)
    assert.equal(completesOnCreate("TASK"), false)
  })
})

describe("vinculos da atividade", () => {
  const links = (input) =>
    resolveActivityLinks({ companyId: null, contactId: null, contact: null, opportunity: null, ...input })

  it("sem vinculo, tudo nulo", () => {
    assert.deepEqual(links({}), { ok: true, companyId: null, contactId: null })
  })

  it("herda empresa e contato da negociacao", () => {
    assert.deepEqual(links({ opportunity: { companyId: "a", contactId: "c" } }), {
      ok: true,
      companyId: "a",
      contactId: "c",
    })
  })

  it("herda a empresa do contato", () => {
    assert.deepEqual(links({ contactId: "c", contact: { companyId: "a" } }), {
      ok: true,
      companyId: "a",
      contactId: "c",
    })
  })

  it("contato informado prevalece sobre o da negociacao", () => {
    const result = links({ contactId: "d", contact: { companyId: null }, opportunity: { companyId: "a", contactId: "c" } })
    assert.equal(result.contactId, "d")
  })

  it("recusa empresas diferentes", () => {
    const error = { ok: false, error: "A atividade liga empresas diferentes." }
    assert.deepEqual(links({ companyId: "b", opportunity: { companyId: "a", contactId: null } }), error)
    assert.deepEqual(links({ contactId: "c", contact: { companyId: "b" }, companyId: "a" }), error)
  })
})

describe("filtros de atividades", () => {
  it("usa os padroes para valores desconhecidos", () => {
    assert.deepEqual(parseActivityFilters({ status: "x", visao: "y", tipo: "z", semana: "abc" }), {
      status: "pendentes",
      view: "lista",
      owner: "todos",
      type: null,
      week: 0,
    })
    assert.equal(parseActivityFilters({ semana: "9999" }).week, 0)
  })

  it("le os filtros e monta a URL sem os padroes", () => {
    const filters = parseActivityFilters({ status: "concluidas", visao: "agenda", tipo: "MEETING", dono: "meus", semana: "-2" })
    assert.deepEqual(filters, { status: "concluidas", view: "agenda", owner: "meus", type: "MEETING", week: -2 })
    assert.equal(activitiesHref(filters), "/atividades?status=concluidas&visao=agenda&dono=meus&tipo=MEETING&semana=-2")
    assert.equal(activitiesHref(parseActivityFilters({})), "/atividades")
  })
})

describe("semana da agenda", () => {
  const keys = (day, offset) => weekDays(day, offset).map(dayKey)

  it("vai de segunda a domingo", () => {
    // 05/11/2026 e quinta-feira.
    assert.deepEqual(keys({ year: 2026, month: 11, day: 5 }), [
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
    ])
  })

  it("domingo pertence a semana que comecou na segunda anterior", () => {
    assert.equal(keys({ year: 2026, month: 11, day: 8 })[0], "2026-11-02")
  })

  it("navega entre semanas, atravessando o ano", () => {
    assert.equal(keys({ year: 2026, month: 12, day: 30 }, 1)[0], "2027-01-04")
    assert.equal(keys({ year: 2026, month: 11, day: 5 }, -1)[0], "2026-10-26")
  })
})
