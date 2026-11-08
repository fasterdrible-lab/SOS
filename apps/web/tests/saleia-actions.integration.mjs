// Testa as decisoes sobre os insights do SALEIA (Tarefa V2-7.3) por HTTP, contra o
// app e o banco de desenvolvimento: recomendacao vira atividade, etapa sugerida
// move a negociacao, descartar e desfazer, escopo do papel, Meu Dia e telas.
// Reunioes e insights entram direto no banco (o recebimento e testado em
// saleia.integration.mjs). Cria apenas registros com o prefixo abaixo, removidos
// ao final. Recusa rodar fora de localhost (tests/support.mjs).
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb, ensurePipelines, legacyColumns, stageIdOf } from "./support.mjs"

const PREFIX = "saleia-acoes-test-"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORG = id("org")
const ORG_B = id("org-b")

async function cleanup() {
  await db.query(`delete from activities where "organizationId" = any($1)`, [[ORG, ORG_B]])
  await db.query(`delete from organizations where id = any($1)`, [[ORG, ORG_B]])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

const decide = async (name, insight, action) => {
  const response = await (await login(name)).json(`/api/saleia/insights/${id(insight)}`, "POST", { action })
  return { status: response.status, body: await response.json() }
}
const statusOf = async (insight) =>
  (await db.query(`select status from saleia_insights where id = $1`, [id(insight)])).rows[0].status
const opportunity = async (name) =>
  (await db.query(`select "stageId", probability from opportunities where id = $1`, [id(name)])).rows[0]

before(async () => {
  await db.connect()
  await cleanup()

  for (const organization of [ORG, ORG_B]) {
    await db.query(`insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`, [organization])
  }
  await ensurePipelines(db, [ORG, ORG_B])

  const hash = await bcrypt.hash(PASSWORD, 4)
  for (const [name, organization, role] of [
    ["gestor", ORG, "MANAGER"],
    ["vendedor1", ORG, "MEMBER"],
    ["vendedor2", ORG, "MEMBER"],
    ["outro", ORG_B, "CONSULTANT"],
  ]) {
    await db.query(
      `insert into users (id, name, email, "passwordHash", "updatedAt") values ($1, $1, $2, $3, now())`,
      [id(name), email(name), hash]
    )
    await db.query(
      `insert into organization_members (id, "organizationId", "userId", role) values ($1, $2, $1, $3)`,
      [id(name), organization, role]
    )
  }

  await db.query(`insert into companies (id, "organizationId", name, "updatedAt") values ($1, $2, $3, now())`, [
    id("acme"),
    ORG,
    `${PREFIX}Acme`,
  ])
  await db.query(
    `insert into contacts (id, "organizationId", "companyId", name, "updatedAt") values ($1, $2, $3, 'Ana', now())`,
    [id("ana"), ORG, id("acme")]
  )

  for (const [name, owner, company, contact, legacy] of [
    ["v1-negocio", "vendedor1", "acme", "ana", "PROPOSAL"],
    ["v1-ganha", "vendedor1", null, null, "CLOSED_WON"],
    ["v2-negocio", "vendedor2", null, null, "QUALIFICATION"],
  ]) {
    await db.query(
      `insert into opportunities (id, "organizationId", "ownerId", "companyId", "contactId", title, value, "pipelineId", "stageId", status, "updatedAt")
       values ($1, $2, $3, $4, $5, $1, 1000, $6, $7, $8, now())`,
      [id(name), ORG, id(owner), company && id(company), contact && id(contact), ...legacyColumns(ORG, legacy)]
    )
  }

  const meetings = [
    ["m1", "v1-negocio", "acme", "ana", "2026-11-05T14:00:00Z"],
    ["m2", null, null, null, "2026-11-04T14:00:00Z"],
    ["m3", "v2-negocio", null, null, "2026-11-03T14:00:00Z"],
    ["m4", "v1-ganha", null, null, "2026-11-02T14:00:00Z"],
  ]
  for (const [name, opp, company, contact, startedAt] of meetings) {
    await db.query(
      `insert into saleia_meetings (id, "organizationId", "externalId", title, "startedAt", participants, summary, "companyId", "contactId", "opportunityId", "analyzedAt", "updatedAt")
       values ($1, $2, $1, $3, $4, '[]', 'Resumo', $5, $6, $7, now(), now())`,
      [id(name), ORG, `Reuniao ${name}`, startedAt, company && id(company), contact && id(contact), opp && id(opp)]
    )
  }

  const insights = [
    ["rec1", "m1", "RECOMMENDATION", "Enviar proposta revisada", null, "2026-11-10T15:00:00Z", "Mande ate sexta"],
    ["rec2", "m1", "RECOMMENDATION", "Agendar demonstracao tecnica", null, null, null],
    ["stg1", "m1", "STAGE_SUGGESTION", "Cliente quer fechar contrato", "NEGOCIACAO", null, null],
    ["stg2", "m1", "STAGE_SUGGESTION", "Mostrar o produto", "Demonstracao", null, null],
    ["obj1", "m1", "OBJECTION", "Preco alto", null, null, null],
    ["rec3", "m2", "RECOMMENDATION", "Descobrir quem decide", null, null, null],
    ["stg3", "m2", "STAGE_SUGGESTION", "Pediu proposta", "Proposta", null, null],
    ["rec4", "m3", "RECOMMENDATION", "Ligar para o financeiro", null, null, null],
    ["stg4", "m4", "STAGE_SUGGESTION", "Proposta", "Proposta", null, null],
    ["rec5", "m1", "RECOMMENDATION", "Revisar escopo com o cliente", null, null, null],
  ]
  for (const [index, [name, meeting, kind, text, stageName, dueDate, quote]] of insights.entries()) {
    await db.query(
      `insert into saleia_insights (id, "organizationId", "meetingId", kind, text, quote, "stageName", "dueDate", position, "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
      [id(name), ORG, id(meeting), kind, text, quote, stageName, dueDate, index]
    )
  }
})

after(async () => {
  await cleanup()
  await db.end()
})

describe("acesso", () => {
  it("fora do escopo ou de outra organizacao responde 404 sem mudar nada", async () => {
    assert.equal((await decide("vendedor2", "rec1", "accept")).status, 404)
    assert.equal((await decide("outro", "rec1", "dismiss")).status, 404)
    assert.equal(await statusOf("rec1"), "OPEN")
  })

  it("exige sessao e corpo valido; informativo nao tem decisao", async () => {
    const anonymous = await new Client().json(`/api/saleia/insights/${id("rec1")}`, "POST", { action: "accept" })
    assert.ok([401, 302, 307].includes(anonymous.status))
    assert.equal((await decide("vendedor1", "rec1", "aplicar")).status, 400)
    assert.equal((await decide("vendedor1", "obj1", "accept")).status, 422)
  })
})

describe("recomendacao", () => {
  it("aceitar cria a tarefa ligada a negociacao, para o dono, com prazo e origem", async () => {
    const result = await decide("vendedor1", "rec1", "accept")
    assert.equal(result.status, 200)
    assert.equal(result.body.insight.status, "ACCEPTED")
    assert.ok(result.body.activityId)

    const { rows } = await db.query(`select * from activities where id = $1`, [result.body.activityId])
    const activity = rows[0]
    assert.equal(activity.type, "TASK")
    assert.equal(activity.title, "Enviar proposta revisada")
    assert.equal(activity.ownerId, id("vendedor1"))
    assert.equal(activity.opportunityId, id("v1-negocio"))
    assert.equal(activity.companyId, id("acme"))
    assert.equal(activity.contactId, id("ana"))
    // Mesmo driver dos dois lados: o pg le timestamp sem fuso como hora local.
    const insight = await db.query(`select "dueDate" from saleia_insights where id = $1`, [id("rec1")])
    assert.equal(activity.dueDate.getTime(), insight.rows[0].dueDate.getTime())
    assert.equal(activity.completedAt, null)
    assert.match(activity.description, /Reuniao m1.*SALEIA/)
    assert.match(activity.description, /Mande ate sexta/)

    const audit = await db.query(
      `select action, metadata from audit_logs where "organizationId" = $1 and "entityId" = $2`,
      [ORG, id("rec1")]
    )
    assert.equal(audit.rows[0].action, "saleia.insight-accepted")
    assert.equal(audit.rows[0].metadata.activityId, result.body.activityId)
  })

  it("aceito e definitivo", async () => {
    assert.equal((await decide("vendedor1", "rec1", "accept")).status, 409)
    assert.equal((await decide("gestor", "rec1", "dismiss")).status, 409)
    assert.equal((await decide("gestor", "rec1", "reopen")).status, 409)
  })

  it("gestor aceita a de reuniao sem vinculo: a tarefa fica com ele, sem vinculo", async () => {
    const result = await decide("gestor", "rec3", "accept")
    assert.equal(result.status, 200)
    const { rows } = await db.query(`select "ownerId", "opportunityId", "companyId" from activities where id = $1`, [result.body.activityId])
    assert.deepEqual(rows[0], { ownerId: id("gestor"), opportunityId: null, companyId: null })
  })

  it("gestor aceitando a de outro vendedor atribui ao dono da negociacao", async () => {
    const result = await decide("gestor", "rec4", "accept")
    assert.equal(result.status, 200)
    const { rows } = await db.query(`select "ownerId" from activities where id = $1`, [result.body.activityId])
    assert.equal(rows[0].ownerId, id("vendedor2"))
  })

  it("descartar e desfazer", async () => {
    const dismissed = await decide("vendedor1", "rec2", "dismiss")
    assert.equal(dismissed.status, 200)
    assert.equal(await statusOf("rec2"), "DISMISSED")
    assert.equal((await decide("vendedor1", "rec2", "accept")).status, 409)

    assert.equal((await decide("vendedor1", "rec2", "reopen")).status, 200)
    assert.equal(await statusOf("rec2"), "OPEN")
    assert.equal((await decide("vendedor1", "rec2", "reopen")).status, 409)

    const count = await db.query(`select count(*)::int as n from activities where "organizationId" = $1 and title like 'Agendar%'`, [ORG])
    assert.equal(count.rows[0].n, 0)
  })

  it("duas aceitacoes simultaneas criam uma unica atividade", async () => {
    const [first, second] = await Promise.all([
      decide("vendedor1", "rec5", "accept"),
      decide("gestor", "rec5", "accept"),
    ])
    assert.deepEqual([first.status, second.status].sort(), [200, 409])
    const count = await db.query(`select count(*)::int as n from activities where "organizationId" = $1 and title like 'Revisar escopo%'`, [ORG])
    assert.equal(count.rows[0].n, 1)
  })
})

describe("etapa sugerida", () => {
  it("move a negociacao pelo nome sem acento e grava o historico", async () => {
    const before = await opportunity("v1-negocio")
    assert.equal(before.stageId, stageIdOf(ORG, "PROPOSAL"))

    const result = await decide("vendedor1", "stg1", "accept")
    assert.equal(result.status, 200)
    assert.equal(result.body.stageChanged, true)

    const after = await opportunity("v1-negocio")
    assert.equal(after.stageId, stageIdOf(ORG, "NEGOTIATION"))
    assert.equal(after.probability, 75)

    const { rows } = await db.query(
      `select "fromStageId", "toStageId", "changedById" from opportunity_stage_history where "opportunityId" = $1 order by "changedAt" desc limit 1`,
      [id("v1-negocio")]
    )
    assert.deepEqual(rows[0], {
      fromStageId: stageIdOf(ORG, "PROPOSAL"),
      toStageId: stageIdOf(ORG, "NEGOTIATION"),
      changedById: id("vendedor1"),
    })
  })

  it("etapa inexistente, sem negociacao ou negociacao encerrada: 422 e continua em aberto", async () => {
    const missing = await decide("vendedor1", "stg2", "accept")
    assert.equal(missing.status, 422)
    assert.match(missing.body.error, /Demonstracao/)
    assert.equal((await decide("gestor", "stg3", "accept")).status, 422)
    assert.equal((await decide("vendedor1", "stg4", "accept")).status, 422)
    for (const name of ["stg2", "stg3", "stg4"]) assert.equal(await statusOf(name), "OPEN")
    assert.equal((await opportunity("v1-negocio")).stageId, stageIdOf(ORG, "NEGOTIATION"))
  })

  it("etapa inexistente ainda pode ser descartada", async () => {
    assert.equal((await decide("vendedor1", "stg2", "dismiss")).status, 200)
  })
})

describe("Meu Dia e telas", () => {
  const myDay = async (name) => {
    const response = await (await login(name)).request("/api/meu-dia")
    assert.equal(response.status, 200)
    return (await response.json()).summary.saleia
  }
  const html = async (name, path) => {
    const response = await (await login(name)).request(path)
    assert.equal(response.status, 200, path)
    return response.text()
  }

  it("lista so as pendentes, no escopo do papel", async () => {
    const seller = await myDay("vendedor1")
    assert.deepEqual(seller.items.map((item) => item.id).sort(), [id("rec2"), id("stg4")].sort())
    assert.equal(seller.total, 2)

    assert.deepEqual((await myDay("vendedor2")).items, [])
    const manager = await myDay("gestor")
    assert.ok(manager.items.some((item) => item.id === id("stg3")))
    assert.ok(!manager.items.some((item) => item.id === id("rec1")))
  })

  it("Meu Dia e reuniao mostram as acoes", async () => {
    const page = await html("vendedor1", "/meu-dia")
    assert.match(page, /Recomendações da SALEIA/)
    assert.match(page, /Agendar demonstracao tecnica/)

    const meeting = await html("vendedor1", `/saleia/${id("m1")}`)
    assert.match(meeting, /Criar atividade/)
    assert.match(meeting, /Virou atividade/)
    assert.match(meeting, /Aplicada/)
    assert.match(meeting, /Desfazer descarte/)
  })
})
