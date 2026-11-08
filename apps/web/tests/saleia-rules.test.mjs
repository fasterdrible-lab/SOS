import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  ACTIVITY_TITLE_MAX,
  matchMeeting,
  normalizeStageName,
  participantEmails,
  planInsightDecision,
  recommendationActivity,
  sortInsights,
  stageSuggestionState,
} from "../lib/saleia/rules.ts"
import {
  SECRET_PREFIX,
  generateSaleiaSecret,
  signSaleiaPayload,
  verifySaleiaSignature,
} from "../lib/saleia/signature.ts"

describe("assinatura dos eventos do SALEIA", () => {
  const secret = "slia_segredo-de-teste"
  const body = '{"ok":true}'
  const now = new Date("2026-11-06T12:00:00Z")
  const timestamp = String(now.getTime() / 1000)
  const check = (overrides = {}) =>
    verifySaleiaSignature({
      secret,
      timestamp,
      signature: signSaleiaPayload(secret, timestamp, body),
      body,
      now,
      ...overrides,
    })

  it("aceita a assinatura correta, inclusive em maiusculas", () => {
    assert.deepEqual(check(), { ok: true })
    assert.deepEqual(check({ signature: signSaleiaPayload(secret, timestamp, body).toUpperCase() }), { ok: true })
  })

  it("recusa corpo, segredo ou formato diferentes", () => {
    assert.deepEqual(check({ body: '{"ok":false}' }), { ok: false, reason: "mismatch" })
    assert.deepEqual(check({ secret: "outro" }), { ok: false, reason: "mismatch" })
    assert.deepEqual(check({ signature: "sha256=abc" }), { ok: false, reason: "mismatch" })
  })

  it("recusa sem cabecalhos e fora da janela de 5 minutos", () => {
    assert.deepEqual(check({ signature: null }), { ok: false, reason: "missing" })
    assert.deepEqual(check({ timestamp: null }), { ok: false, reason: "missing" })
    const old = String(now.getTime() / 1000 - 301)
    assert.deepEqual(check({ timestamp: old, signature: signSaleiaPayload(secret, old, body) }), { ok: false, reason: "stale" })
    assert.deepEqual(check({ timestamp: "1.5e9" }), { ok: false, reason: "stale" })
    const edge = String(now.getTime() / 1000 + 300)
    assert.deepEqual(check({ timestamp: edge, signature: signSaleiaPayload(secret, edge, body) }), { ok: true })
  })

  it("gera segredos distintos com prefixo", () => {
    const a = generateSaleiaSecret()
    assert.ok(a.startsWith(SECRET_PREFIX) && a.length > 40)
    assert.notEqual(a, generateSaleiaSecret())
  })
})

describe("vinculo da reuniao com o CRM", () => {
  const none = () => []
  const match = (input) =>
    matchMeeting({ opportunity: null, contacts: [], company: null, openOpportunitiesOf: none, ...input })

  it("negociacao informada prevalece", () => {
    const result = match({
      opportunity: { id: "o1", companyId: "c1", contactId: "p1" },
      contacts: [{ id: "p2", companyId: "c2" }],
    })
    assert.deepEqual(result, { opportunityId: "o1", companyId: "c1", contactId: "p1", via: "opportunity" })
  })

  it("contato pelo e-mail traz a empresa e a unica negociacao em andamento", () => {
    const result = match({
      contacts: [{ id: "p1", companyId: "c1" }],
      openOpportunitiesOf: (id) => (id === "c1" ? [{ id: "o1", companyId: "c1", contactId: null }] : []),
    })
    assert.deepEqual(result, { opportunityId: "o1", companyId: "c1", contactId: "p1", via: "contact" })
  })

  it("com mais de uma negociacao em andamento, liga so a empresa", () => {
    const open = [
      { id: "o1", companyId: "c1", contactId: null },
      { id: "o2", companyId: "c1", contactId: null },
    ]
    const result = match({ company: { id: "c1" }, openOpportunitiesOf: () => open })
    assert.deepEqual(result, { opportunityId: null, companyId: "c1", contactId: null, via: "company" })
  })

  it("empresa pelo nome herda o contato da negociacao", () => {
    const result = match({
      company: { id: "c1" },
      openOpportunitiesOf: () => [{ id: "o1", companyId: "c1", contactId: "p9" }],
    })
    assert.equal(result.contactId, "p9")
  })

  it("contatos de empresas diferentes nao definem empresa", () => {
    const result = match({
      contacts: [
        { id: "p1", companyId: "c1" },
        { id: "p2", companyId: "c2" },
      ],
      company: { id: "c3" },
    })
    assert.deepEqual(result, { opportunityId: null, companyId: null, contactId: "p1", via: "contact" })
  })

  it("contato sem empresa usa a empresa pelo nome", () => {
    const result = match({ contacts: [{ id: "p1", companyId: null }], company: { id: "c1" } })
    assert.equal(result.companyId, "c1")
  })

  it("sem nada, sem vinculo", () => {
    assert.deepEqual(match({}), { opportunityId: null, companyId: null, contactId: null, via: null })
  })
})

describe("apoio", () => {
  it("normaliza e-mails dos participantes", () => {
    assert.deepEqual(
      participantEmails([{ email: " Ana@X.com " }, { email: "ana@x.com" }, { email: null }, {}]),
      ["ana@x.com"]
    )
  })

  it("ordena insights pelo que pede acao", () => {
    const sorted = sortInsights([
      { kind: "EVIDENCE", position: 0 },
      { kind: "RECOMMENDATION", position: 2 },
      { kind: "OBJECTION", position: 1 },
      { kind: "RECOMMENDATION", position: 1 },
    ])
    assert.deepEqual(
      sorted.map((item) => `${item.kind}:${item.position}`),
      ["RECOMMENDATION:1", "RECOMMENDATION:2", "OBJECTION:1", "EVIDENCE:0"]
    )
  })
})

describe("decisoes sobre os insights (V2-7.3)", () => {
  it("aceita ou descarta so recomendacao e etapa sugerida em aberto", () => {
    assert.deepEqual(planInsightDecision({ kind: "RECOMMENDATION", status: "OPEN", action: "accept" }), {
      ok: true,
      from: "OPEN",
      to: "ACCEPTED",
    })
    assert.deepEqual(planInsightDecision({ kind: "STAGE_SUGGESTION", status: "OPEN", action: "dismiss" }), {
      ok: true,
      from: "OPEN",
      to: "DISMISSED",
    })
    assert.equal(planInsightDecision({ kind: "OBJECTION", status: "OPEN", action: "accept" }).status, 422)
    assert.equal(planInsightDecision({ kind: "RECOMMENDATION", status: "ACCEPTED", action: "dismiss" }).status, 409)
    assert.equal(planInsightDecision({ kind: "RECOMMENDATION", status: "DISMISSED", action: "accept" }).status, 409)
  })

  it("so desfaz o descarte; aceito e definitivo", () => {
    assert.deepEqual(planInsightDecision({ kind: "RECOMMENDATION", status: "DISMISSED", action: "reopen" }), {
      ok: true,
      from: "DISMISSED",
      to: "OPEN",
    })
    assert.equal(planInsightDecision({ kind: "RECOMMENDATION", status: "ACCEPTED", action: "reopen" }).status, 409)
    assert.equal(planInsightDecision({ kind: "RECOMMENDATION", status: "OPEN", action: "reopen" }).status, 409)
  })
})

describe("etapa sugerida", () => {
  const stages = [
    { id: "s1", name: "Prospecção", position: 1, archived: false },
    { id: "s3", name: "Proposta", position: 3, archived: false },
    { id: "s4", name: "Negociação", position: 4, archived: false },
    { id: "s5", name: "Contrato", position: 5, archived: true },
  ]
  const open = (stageId) => ({ status: "OPEN", stageId })

  it("compara nomes sem acento, maiusculas nem espacos", () => {
    assert.equal(normalizeStageName("  Negociação  Final "), "negociacao final")
    assert.deepEqual(stageSuggestionState({ suggested: "NEGOCIACAO", opportunity: open("s3"), stages }), {
      state: "forward",
      stageId: "s4",
      stageName: "Negociação",
    })
  })

  it("indica etapa atual, anterior, inexistente ou arquivada", () => {
    assert.equal(stageSuggestionState({ suggested: "Proposta", opportunity: open("s3"), stages }).state, "current")
    assert.equal(stageSuggestionState({ suggested: "Prospeccao", opportunity: open("s3"), stages }).state, "backward")
    assert.equal(stageSuggestionState({ suggested: "Demonstracao", opportunity: open("s3"), stages }).state, "missing")
    assert.equal(stageSuggestionState({ suggested: "Contrato", opportunity: open("s3"), stages }).state, "missing")
    assert.equal(stageSuggestionState({ suggested: null, opportunity: open("s3"), stages }).state, "missing")
  })

  it("sem negociacao ou com ela encerrada nao ha etapa a aplicar", () => {
    assert.equal(stageSuggestionState({ suggested: "Proposta", opportunity: null, stages }).state, "no-opportunity")
    assert.equal(
      stageSuggestionState({ suggested: "Proposta", opportunity: { status: "WON", stageId: "s4" }, stages }).state,
      "closed"
    )
  })
})

describe("atividade da recomendacao", () => {
  const base = { quote: null, dueDate: null, meetingTitle: "Reuniao Acme", meetingDate: "05/11/2026" }

  it("vira tarefa com o prazo sugerido e a origem na descricao", () => {
    const due = new Date("2026-11-10T12:00:00Z")
    const activity = recommendationActivity({ ...base, text: "Enviar  proposta\nrevisada", quote: "Mande ate sexta", dueDate: due })
    assert.equal(activity.type, "TASK")
    assert.equal(activity.title, "Enviar proposta revisada")
    assert.equal(activity.dueDate, due)
    assert.match(activity.description, /Reuniao Acme.*SALEIA, 05\/11\/2026/)
    assert.match(activity.description, /Trecho: "Mande ate sexta"/)
  })

  it("corta titulo longo e guarda o texto inteiro na descricao", () => {
    const text = "a".repeat(300)
    const activity = recommendationActivity({ ...base, text })
    assert.equal(activity.title.length, ACTIVITY_TITLE_MAX)
    assert.ok(activity.title.endsWith("…"))
    assert.ok(activity.description.includes(text))
  })
})
