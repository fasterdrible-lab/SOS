// Testa a visao 360 da empresa e a edicao de empresa e contato (Tarefa V2-5) por
// HTTP, contra o app e o banco de desenvolvimento. Cria apenas registros com o
// prefixo abaixo, removidos ao final. Recusa rodar fora de localhost.
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb, ensurePipelines, legacyColumns, stageIdOf, statusOf } from "./support.mjs"

const PREFIX = "c360-test-"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORG = id("org")
const ORG_B = id("org-b")

async function cleanup() {
  await db.query(`delete from organizations where id = any($1)`, [[ORG, ORG_B]])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

async function overview(name, company = "acme") {
  const response = await (await login(name)).request(`/api/companies/${id(company)}`)
  assert.equal(response.status, 200)
  return (await response.json()).company
}

const companyBody = (extra = {}) => ({ name: "Acme Comercio", segment: "Varejo", ...extra })
const contactBody = (extra = {}) => ({ name: "Ana Souza", companyId: id("acme"), ...extra })

before(async () => {
  await db.connect()
  await cleanup()

  for (const organization of [ORG, ORG_B]) {
    await db.query(
      `insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`,
      [organization]
    )
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

  for (const [name, organization, label] of [
    ["acme", ORG, "Acme Comercio"],
    ["vazia", ORG, "Empresa Vazia"],
    ["alheia", ORG_B, "Empresa Alheia"],
  ]) {
    await db.query(
      `insert into companies (id, "organizationId", name, segment, "updatedAt") values ($1, $2, $3, 'Varejo', now())`,
      [id(name), organization, label]
    )
  }

  await db.query(
    `insert into contacts (id, "organizationId", "companyId", name, "updatedAt") values ($1, $2, $3, 'Ana Souza', now())`,
    [id("ana"), ORG, id("acme")]
  )
  await db.query(
    `insert into contacts (id, "organizationId", name, "updatedAt") values ($1, $2, 'Livre', now())`,
    [id("livre"), ORG]
  )
  await db.query(
    `insert into leads (id, "organizationId", "companyId", name, source, "updatedAt") values ($1, $2, $3, 'Lead Acme', 'Instagram', now())`,
    [id("lead"), ORG, id("acme")]
  )
  await db.query(
    `insert into diagnostics (id, "organizationId", "companyName", segment, revenue, sellers, "monthlyLeads",
       "averageTicket", "conversionRate", "maturityScore")
     values ($1, $2, 'ACME comercio', 'Varejo', '1M', 3, 50, 1000, 10, 72)`,
    [id("diagnostico"), ORG]
  )

  for (const [name, owner, value, stage] of [
    ["v1-ganha", "vendedor1", 1000, "CLOSED_WON"],
    ["v1-aberta", "vendedor1", 500, "PROPOSAL"],
    ["v2-ganha", "vendedor2", 3000, "CLOSED_WON"],
    ["v2-perdida", "vendedor2", 200, "CLOSED_LOST"],
  ]) {
    await db.query(
      `insert into opportunities (id, "organizationId", "ownerId", "companyId", "contactId", title, value,
         "pipelineId", "stageId", status, "updatedAt")
       values ($1, $2, $3, $4, $5, $1, $6, $7, $8, $9, now())`,
      [id(name), ORG, id(owner), id("acme"), name === "v1-aberta" ? id("ana") : null, value, ...legacyColumns(ORG, stage)]
    )
    await db.query(
      `insert into opportunity_stage_history (id, "organizationId", "opportunityId", "toStageId", "toStatus")
       values ($1, $2, $3, $4, $5)`,
      [id(`h-${name}`), ORG, id(name), stageIdOf(ORG, stage), statusOf(stage)]
    )
  }
})

after(async () => {
  await cleanup()
  await db.end()
})

describe("visao 360", () => {
  it("gestor ve a empresa inteira", async () => {
    const company = await overview("gestor")
    assert.equal(company.scope, "ORGANIZATION")
    assert.deepEqual(company.summary.won, { count: 2, value: 4000 })
    assert.deepEqual(company.summary.open, { count: 1, value: 500 })
    assert.equal(company.summary.lostCount, 1)
    assert.equal(company.summary.winRate, 66.7)
    assert.equal(company.opportunities.length, 4)
    assert.equal(company.opportunities[0].status, "OPEN")
    assert.equal(company.timeline.length, 4)
  })

  it("traz contatos, leads e o diagnostico pelo nome", async () => {
    const company = await overview("gestor")
    assert.deepEqual(company.contacts.map((contact) => contact.id), [id("ana")])
    assert.deepEqual(company.leads.map((lead) => [lead.name, lead.source, lead.status]), [["Lead Acme", "Instagram", "NEW"]])
    assert.equal(company.diagnostic.id, id("diagnostico"))
    assert.equal(company.diagnostic.maturityScore, 72)
  })

  it("vendedor ve so as proprias negociacoes, nos numeros e na linha do tempo", async () => {
    const company = await overview("vendedor1")
    assert.equal(company.scope, "OWN")
    assert.deepEqual(company.summary.won, { count: 1, value: 1000 })
    assert.deepEqual(company.summary.open, { count: 1, value: 500 })
    assert.deepEqual(company.opportunities.map((item) => item.id).sort(), [id("v1-aberta"), id("v1-ganha")].sort())
    assert.ok(company.timeline.every((entry) => [id("v1-aberta"), id("v1-ganha")].includes(entry.opportunityId)))
    assert.equal(company.leads, null)
    assert.equal(company.contacts.length, 1)
  })

  it("empresa sem nada nao quebra", async () => {
    const company = await overview("gestor", "vazia")
    assert.equal(company.summary.winRate, null)
    assert.deepEqual(company.opportunities, [])
    assert.equal(company.diagnostic, null)
    const page = await (await login("gestor")).request(`/empresas/${id("vazia")}`)
    assert.equal(page.status, 200)
    assert.match(await page.text(), /Nenhuma negociação nesta empresa/)
  })

  it("nao abre empresa de outra organizacao", async () => {
    const gestor = await login("gestor")
    assert.equal((await gestor.request(`/api/companies/${id("alheia")}`)).status, 404)
    assert.equal((await gestor.request(`/empresas/${id("alheia")}`)).status, 404)
  })

  it("pagina mostra o que o papel pode ver e a lista liga ao detalhe", async () => {
    const gestor = await (await (await login("gestor")).request(`/empresas/${id("acme")}`)).text()
    assert.match(gestor, /Linha do tempo/)
    assert.match(gestor, /Leads \(1\)/)
    assert.match(gestor, /SALEIA/)
    assert.ok(gestor.includes(id("v2-ganha")))

    const vendedor = await (await (await login("vendedor1")).request(`/empresas/${id("acme")}`)).text()
    assert.ok(!vendedor.includes(id("v2-ganha")))
    assert.ok(!vendedor.includes("Leads ("))

    const lista = await (await (await login("gestor")).request("/empresas")).text()
    assert.ok(lista.includes(`/empresas/${id("acme")}`))
  })

  it("lista mostra o aberto no escopo do papel", async () => {
    await (await login("gestor")).json(`/api/opportunities/${id("v2-ganha")}`, "PATCH", { status: "OPEN" })
    const brl = (page) => page.includes("R$ 3.500") || page.includes("R$&nbsp;3.500") || page.includes("R$ 3.500")
    assert.ok(brl(await (await (await login("gestor")).request("/empresas")).text()))
    assert.ok(!brl(await (await (await login("vendedor1")).request("/empresas")).text()))
    await (await login("gestor")).json(`/api/opportunities/${id("v2-ganha")}`, "PATCH", { status: "WON" })
  })
})

describe("editar empresa", () => {
  const put = (client, name, body) => client.json(`/api/companies/${id(name)}`, "PUT", body)

  it("edita, limpa campos e audita so os nomes dos campos", async () => {
    const vendedor = await login("vendedor1")
    const response = await put(vendedor, "vazia", {
      name: "Empresa Renomeada",
      segment: "",
      website: "https://exemplo.test",
      phone: "11 99999-0000",
      email: "contato@exemplo.test",
    })
    assert.equal(response.status, 200)
    const { company } = await response.json()
    assert.equal(company.name, "Empresa Renomeada")
    assert.equal(company.segment, null)

    const { rows } = await db.query(
      `select metadata from audit_logs where "entityId" = $1 and action = 'company.updated'`,
      [id("vazia")]
    )
    assert.deepEqual(rows, [{ metadata: { fields: ["name", "segment", "website", "phone", "email"] } }])
  })

  it("sem mudanca nao audita", async () => {
    const gestor = await login("gestor")
    assert.equal((await put(gestor, "acme", companyBody())).status, 200)
    const { rows } = await db.query(`select 1 from audit_logs where "entityId" = $1`, [id("acme")])
    assert.equal(rows.length, 0)
  })

  it("valida e nao alcanca outra organizacao", async () => {
    const gestor = await login("gestor")
    assert.equal((await put(gestor, "acme", { name: "x" })).status, 400)
    assert.equal((await put(gestor, "acme", companyBody({ email: "invalido" }))).status, 400)
    assert.equal((await put(gestor, "alheia", companyBody())).status, 404)
  })
})

describe("editar contato", () => {
  const put = (client, name, body) => client.json(`/api/contacts/${id(name)}`, "PUT", body)

  it("edita e limpa campos, com auditoria", async () => {
    const vendedor = await login("vendedor1")
    assert.equal((await put(vendedor, "ana", contactBody({ role: "Diretora", phone: "11 3333-0000" }))).status, 200)
    const { rows } = await db.query(`select role, phone from contacts where id = $1`, [id("ana")])
    assert.deepEqual(rows, [{ role: "Diretora", phone: "11 3333-0000" }])

    assert.equal((await put(vendedor, "ana", contactBody({ role: "" }))).status, 200)
    const after = await db.query(`select role, phone from contacts where id = $1`, [id("ana")])
    assert.deepEqual(after.rows, [{ role: null, phone: null }])

    const audit = await db.query(`select count(*)::int as total from audit_logs where "entityId" = $1 and action = 'contact.updated'`, [id("ana")])
    assert.equal(audit.rows[0].total, 2)
  })

  it("nao troca para empresa de outra organizacao", async () => {
    const response = await put(await login("gestor"), "livre", { name: "Livre", companyId: id("alheia") })
    assert.equal(response.status, 400)
  })

  it("nao troca de empresa com negociacao em outra", async () => {
    const response = await put(await login("gestor"), "ana", contactBody({ companyId: id("vazia") }))
    assert.equal(response.status, 409)
    assert.equal((await response.json()).error, "Este contato tem negociacoes em outra empresa.")
  })

  it("contato sem negociacoes muda de empresa", async () => {
    const response = await put(await login("gestor"), "livre", { name: "Livre", companyId: id("vazia") })
    assert.equal(response.status, 200)
  })

  it("nao alcanca contato de outra organizacao", async () => {
    assert.equal((await put(await login("outro"), "ana", contactBody())).status, 404)
  })
})
