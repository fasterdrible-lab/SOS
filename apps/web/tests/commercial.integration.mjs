// Testa as regras comerciais (Tarefa V2-1.2) por HTTP, contra o app e o banco
// de desenvolvimento. Cria apenas registros com o prefixo abaixo, removidos ao
// final. Recusa rodar fora de localhost (tests/support.mjs).
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb } from "./support.mjs"

const PREFIX = "commercial-test-"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORG = id("org")

async function cleanup() {
  await db.query(`delete from organizations where id = $1`, [ORG])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

before(async () => {
  await db.connect()
  await cleanup()

  await db.query(
    `insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`,
    [ORG]
  )

  const hash = await bcrypt.hash(PASSWORD, 4)
  for (const [name, role] of [
    ["admin", "CONSULTANT"],
    ["gestor", "MANAGER"],
    ["vendedor", "MEMBER"],
  ]) {
    await db.query(
      `insert into users (id, name, email, "passwordHash", "updatedAt") values ($1, $1, $2, $3, now())`,
      [id(name), email(name), hash]
    )
    await db.query(
      `insert into organization_members (id, "organizationId", "userId", role) values ($1, $2, $1, $3)`,
      [id(name), ORG, role]
    )
  }

  for (const name of ["empresa-a", "empresa-b"]) {
    await db.query(
      `insert into companies (id, "organizationId", name, "updatedAt") values ($1, $2, $1, now())`,
      [id(name), ORG]
    )
  }

  for (const [name, company] of [
    ["contato-a", "empresa-a"],
    ["contato-livre", null],
  ]) {
    await db.query(
      `insert into contacts (id, "organizationId", "companyId", name, "updatedAt")
       values ($1, $2, $3, $1, now())`,
      [id(name), ORG, company ? id(company) : null]
    )
  }

  await db.query(
    `insert into diagnostics (id, "organizationId", "companyName", segment, revenue, sellers,
       "monthlyLeads", "averageTicket", "conversionRate")
     values ($1, $2, $3, 'Servicos', '1M', 3, 50, 1234.56, 10)`,
    [id("diagnostico"), ORG, id("empresa-diagnostico")]
  )
})

after(async () => {
  await cleanup()
  await db.end()
})

async function createOpportunity(client, body) {
  const response = await client.json("/api/opportunities", "POST", body)
  return { status: response.status, body: await response.json() }
}

const history = async (opportunityId) =>
  (
    await db.query(
      `select "fromStage", "toStage", "changedById", "lostReason" from opportunity_stage_history
       where "opportunityId" = $1 order by "changedAt", id`,
      [opportunityId]
    )
  ).rows

const moveTo = (client, opportunityId, stage, lostReason) =>
  client.json(`/api/opportunities/${opportunityId}`, "PATCH", { stage, lostReason })

describe("vinculos", () => {
  it("rejeita contato de outra empresa", async () => {
    const vendedor = await login("vendedor")
    const result = await createOpportunity(vendedor, {
      title: "Contato incompativel",
      value: 100,
      companyId: id("empresa-b"),
      contactId: id("contato-a"),
    })
    assert.equal(result.status, 400)
    assert.equal(result.body.error, "O contato pertence a outra empresa.")
  })

  it("herda a empresa do contato e aceita contato sem empresa", async () => {
    const vendedor = await login("vendedor")

    const inherited = await createOpportunity(vendedor, {
      title: "Empresa herdada",
      value: 100,
      contactId: id("contato-a"),
    })
    assert.equal(inherited.status, 201)
    assert.equal(inherited.body.opportunity.companyId, id("empresa-a"))

    const free = await createOpportunity(vendedor, {
      title: "Contato sem empresa",
      value: 100,
      companyId: id("empresa-b"),
      contactId: id("contato-livre"),
    })
    assert.equal(free.status, 201)
    assert.equal(free.body.opportunity.companyId, id("empresa-b"))
  })
})

describe("valores", () => {
  it("guarda centavos sem erro de arredondamento e devolve numero", async () => {
    const admin = await login("admin")
    const created = []
    for (const value of [0.1, 0.2]) {
      const result = await createOpportunity(admin, { title: `Centavos ${value}`, value })
      assert.equal(result.status, 201)
      assert.equal(result.body.opportunity.value, value)
      created.push(result.body.opportunity.id)
    }

    const { rows } = await db.query(
      `select sum(value)::text as total from opportunities where id = any($1)`,
      [created]
    )
    assert.equal(rows[0].total, "0.30")
  })
})

describe("historico e datas", () => {
  it("cria com a primeira entrada do historico e a probabilidade da etapa", async () => {
    const vendedor = await login("vendedor")
    const { body } = await createOpportunity(vendedor, { title: "Nova", value: 500 })

    assert.equal(body.opportunity.stage, "PROSPECTING")
    assert.equal(body.opportunity.probability, 10)
    assert.deepEqual(await history(body.opportunity.id), [
      { fromStage: null, toStage: "PROSPECTING", changedById: id("vendedor"), lostReason: null },
    ])
  })

  it("acumula o historico sem apagar entradas anteriores", async () => {
    const vendedor = await login("vendedor")
    const { body } = await createOpportunity(vendedor, { title: "Avanco", value: 500 })
    const opportunityId = body.opportunity.id

    const proposal = await moveTo(vendedor, opportunityId, "PROPOSAL")
    assert.equal(proposal.status, 200)
    assert.equal((await proposal.json()).opportunity.probability, 50)

    assert.equal((await moveTo(vendedor, opportunityId, "PROPOSAL")).status, 200)
    assert.equal((await moveTo(vendedor, opportunityId, "NEGOTIATION")).status, 200)

    assert.deepEqual(
      (await history(opportunityId)).map((entry) => [entry.fromStage, entry.toStage]),
      [
        [null, "PROSPECTING"],
        ["PROSPECTING", "PROPOSAL"],
        ["PROPOSAL", "NEGOTIATION"],
      ]
    )
  })

  it("preserva a data real do ganho", async () => {
    const vendedor = await login("vendedor")
    const { body } = await createOpportunity(vendedor, { title: "Ganho", value: 900 })
    const opportunityId = body.opportunity.id

    const won = await (await moveTo(vendedor, opportunityId, "CLOSED_WON")).json()
    assert.ok(won.opportunity.wonAt)
    assert.equal(won.opportunity.probability, 100)

    await db.query(`update opportunities set "updatedAt" = now() + interval '1 day' where id = $1`, [
      opportunityId,
    ])
    const again = await (await moveTo(vendedor, opportunityId, "CLOSED_WON")).json()
    assert.equal(again.opportunity.wonAt, won.opportunity.wonAt)
  })

  it("exige motivo para perder e o guarda no historico", async () => {
    const vendedor = await login("vendedor")
    const { body } = await createOpportunity(vendedor, { title: "Perda", value: 900 })
    const opportunityId = body.opportunity.id

    const missing = await moveTo(vendedor, opportunityId, "CLOSED_LOST")
    assert.equal(missing.status, 422)
    const { rows } = await db.query(`select stage from opportunities where id = $1`, [opportunityId])
    assert.equal(rows[0].stage, "PROSPECTING")

    const lost = await (await moveTo(vendedor, opportunityId, "CLOSED_LOST", "Sem orcamento")).json()
    assert.equal(lost.opportunity.lostReason, "Sem orcamento")
    assert.ok(lost.opportunity.lostAt)
    assert.equal(lost.opportunity.probability, 0)
    assert.equal((await history(opportunityId)).at(-1).lostReason, "Sem orcamento")
  })
})

describe("reabertura", () => {
  it("vendedor nao reabre; gestor reabre e limpa datas de fechamento", async () => {
    const vendedor = await login("vendedor")
    const { body } = await createOpportunity(vendedor, { title: "Reabrir", value: 300 })
    const opportunityId = body.opportunity.id
    await moveTo(vendedor, opportunityId, "CLOSED_WON")

    const denied = await moveTo(vendedor, opportunityId, "NEGOTIATION")
    assert.equal(denied.status, 403)

    const gestor = await login("gestor")
    const reopened = await (await moveTo(gestor, opportunityId, "NEGOTIATION")).json()
    assert.equal(reopened.opportunity.stage, "NEGOTIATION")
    assert.equal(reopened.opportunity.wonAt, null)
    assert.equal(reopened.opportunity.probability, 75)

    const entries = await history(opportunityId)
    assert.deepEqual(entries.at(-1), {
      fromStage: "CLOSED_WON",
      toStage: "NEGOTIATION",
      changedById: id("gestor"),
      lostReason: null,
    })
  })
})

describe("concorrencia", () => {
  it("mudancas simultaneas mantem historico encadeado e coerente", async () => {
    const admin = await login("admin")
    const { body } = await createOpportunity(admin, { title: "Concorrente", value: 100 })
    const opportunityId = body.opportunity.id

    const targets = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "QUALIFICATION", "PROPOSAL"]
    const responses = await Promise.all(
      targets.map((stage) => moveTo(admin, opportunityId, stage))
    )
    const statuses = responses.map((response) => response.status)
    assert.ok(statuses.every((status) => status === 200 || status === 409), String(statuses))

    const entries = await history(opportunityId)
    for (let index = 1; index < entries.length; index++) {
      assert.equal(entries[index].fromStage, entries[index - 1].toStage)
    }

    const { rows } = await db.query(`select stage from opportunities where id = $1`, [opportunityId])
    assert.equal(rows[0].stage, entries.at(-1).toStage)
  })

  it("converter o mesmo diagnostico em paralelo gera uma unica oportunidade", async () => {
    const admin = await login("admin")
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        admin.request(`/api/diagnosticos/${id("diagnostico")}/oportunidade`, { method: "POST" })
      )
    )
    assert.deepEqual(
      responses.map((response) => response.status).sort(),
      [200, 200, 200, 201]
    )

    const { rows } = await db.query(
      `select id, value::text, (select count(*) from opportunity_stage_history h where h."opportunityId" = o.id)::int as entries
       from opportunities o where "organizationId" = $1 and notes like $2`,
      [ORG, `%${id("diagnostico")}%`]
    )
    assert.equal(rows.length, 1)
    assert.equal(rows[0].value, "1234.56")
    assert.equal(rows[0].entries, 1)
  })
})
