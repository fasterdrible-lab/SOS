// Testa a busca global, as notificacoes e o tema do cabecalho (Tarefa V2-2.2) por
// HTTP, contra o app e o banco de desenvolvimento. Cria apenas registros com o
// prefixo abaixo, removidos ao final. Recusa rodar fora de localhost.
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb, ensurePipelines, legacyColumns } from "./support.mjs"

const PREFIX = "header-test-"
// Termo raro, para nao encontrar dados de desenvolvimento que ja existam.
const TERM = "Zebraquartzo"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORGS = ["org", "org-b"].map(id)

async function cleanup() {
  await db.query(`delete from organizations where id = any($1)`, [ORGS])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

async function search(client, q) {
  return client.request(`/api/search?q=${encodeURIComponent(q)}`)
}

async function groupsOf(name, q = TERM) {
  const response = await search(await login(name), q)
  assert.equal(response.status, 200)
  const { groups } = await response.json()
  return Object.fromEntries(groups.map((group) => [group.key, group.results.map((result) => result.id)]))
}

async function notificationsOf(name) {
  const response = await (await login(name)).request("/api/notifications")
  assert.equal(response.status, 200)
  return (await response.json()).notifications
}

before(async () => {
  await db.connect()
  await cleanup()

  for (const organization of ORGS) {
    await db.query(
      `insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`,
      [organization]
    )
  }
  await ensurePipelines(db, ORGS)

  const hash = await bcrypt.hash(PASSWORD, 4)
  for (const [name, organization, role] of [
    ["gestor", "org", "MANAGER"],
    ["vendedor1", "org", "MEMBER"],
    ["vendedor2", "org", "MEMBER"],
    ["outro", "org-b", "CONSULTANT"],
  ]) {
    await db.query(
      `insert into users (id, name, email, "passwordHash", "updatedAt") values ($1, $1, $2, $3, now())`,
      [id(name), email(name), hash]
    )
    await db.query(
      `insert into organization_members (id, "organizationId", "userId", role) values ($1, $2, $1, $3)`,
      [id(name), id(organization), role]
    )
  }

  await db.query(
    `insert into companies (id, "organizationId", name, segment, "updatedAt") values ($1, $2, $3, 'Varejo', now())`,
    [id("empresa"), id("org"), `${TERM} Comercio`]
  )
  await db.query(
    `insert into contacts (id, "organizationId", "companyId", name, email, "updatedAt") values ($1, $2, $3, 'Ana Souza', $4, now())`,
    [id("contato"), id("org"), id("empresa"), `ana@${TERM.toLowerCase()}.test`]
  )
  await db.query(
    `insert into companies (id, "organizationId", name, "updatedAt") values ($1, $2, $3, now())`,
    [id("empresa-b"), id("org-b"), `${TERM} Outra Organizacao`]
  )

  const day = 24 * 60 * 60 * 1000
  const now = Date.now()
  const utc = (time) => new Date(time).toISOString()
  for (const [name, owner, title, stage, stageChangedAt, expectedClose, companyId] of [
    ["v1-titulo", "vendedor1", `Contrato ${TERM}`, "PROPOSAL", utc(now), null, null],
    // Encontrada pelo nome da empresa, nao pelo titulo.
    ["v1-pela-empresa", "vendedor1", "Renovacao anual", "NEGOTIATION", utc(now - 20 * day), utc(now - 3 * day), id("empresa")],
    ["v2-titulo", "vendedor2", `Expansao ${TERM}`, "PROSPECTING", utc(now), null, null],
  ]) {
    await db.query(
      `insert into opportunities (id, "organizationId", "ownerId", "companyId", title, value, "pipelineId",
         "stageId", status, "stageChangedAt", "expectedClose", "updatedAt")
       values ($1, $2, $3, $4, $5, 1000, $6, $7, $8, $9, $10, now())`,
      [id(name), id("org"), id(owner), companyId, title, ...legacyColumns(id("org"), stage), stageChangedAt, expectedClose]
    )
  }

  await db.query(
    `insert into action_plans (id, "organizationId", title, objective, "updatedAt") values ($1, $2, $3, 'Crescer', now())`,
    [id("plano"), id("org"), `Plano ${TERM}`]
  )
  await db.query(
    `insert into action_tasks (id, "actionPlanId", title, status, "dueDate", "updatedAt")
     values ($1, $2, 'Ligar para a base', 'PENDING', $3, now())`,
    [id("tarefa-atrasada"), id("plano"), utc(now - 2 * day)]
  )
  await db.query(
    `insert into sdr_conversations (id, "organizationId", classification, "updatedAt") values ($1, $2, 'HOT', now())`,
    [id("conversa"), id("org")]
  )
})

after(async () => {
  await cleanup()
  await db.end()
})

describe("busca global", () => {
  it("gestor encontra negociacoes, empresas, contatos e planos da organizacao", async () => {
    const groups = await groupsOf("gestor")
    assert.deepEqual(groups.opportunities.sort(), [id("v1-pela-empresa"), id("v1-titulo"), id("v2-titulo")].sort())
    assert.deepEqual(groups.companies, [id("empresa")])
    assert.deepEqual(groups.contacts, [id("contato")])
    assert.deepEqual(groups.plans, [id("plano")])
  })

  it("ignora maiusculas e acha contato pelo e-mail", async () => {
    const groups = await groupsOf("gestor", TERM.toUpperCase())
    assert.deepEqual(groups.contacts, [id("contato")])
  })

  it("vendedor encontra apenas as proprias negociacoes", async () => {
    const groups = await groupsOf("vendedor1")
    assert.deepEqual(groups.opportunities.sort(), [id("v1-pela-empresa"), id("v1-titulo")].sort())
    assert.deepEqual(groups.companies, [id("empresa")])
  })

  it("nao encontra dados de outra organizacao", async () => {
    const groups = await groupsOf("outro")
    assert.deepEqual(groups, { companies: [id("empresa-b")] })
  })

  it("negociacao e plano levam ao detalhe; demais, a listagem", async () => {
    const response = await search(await login("gestor"), TERM)
    const { groups } = await response.json()
    const hrefs = Object.fromEntries(groups.map((group) => [group.key, group.results[0].href]))
    const hrefOpportunity = groups.find((group) => group.key === "opportunities").results[0].id
    assert.deepEqual(hrefs, {
      opportunities: `/pipeline/${hrefOpportunity}`,
      companies: "/empresas",
      contacts: "/contatos",
      plans: `/planos/${id("plano")}`,
    })
  })

  it("rejeita termo curto e exige sessao", async () => {
    const short = await search(await login("gestor"), " a ")
    assert.equal(short.status, 400)
    assert.equal((await short.json()).code, "BAD_REQUEST")

    const anonymous = await search(new Client(), TERM)
    assert.ok([401, 302, 307].includes(anonymous.status))
  })
})

describe("notificacoes", () => {
  it("gestor ve leads, tarefas, fechamentos vencidos e negociacoes esfriando", async () => {
    const { total, items } = await notificationsOf("gestor")
    assert.deepEqual(
      Object.fromEntries(items.map((item) => [item.kind, item.count])),
      { "hot-leads": 1, "overdue-tasks": 1, "overdue-close": 1, cooling: 1 }
    )
    assert.equal(total, 4)
  })

  it("vendedor ve so as proprias negociacoes e nao recebe leads do IA SDR", async () => {
    const vendedor1 = await notificationsOf("vendedor1")
    assert.deepEqual(vendedor1.items.map((item) => item.kind), ["overdue-tasks", "overdue-close", "cooling"])

    const vendedor2 = await notificationsOf("vendedor2")
    assert.deepEqual(vendedor2.items.map((item) => item.kind), ["overdue-tasks"])
  })

  it("lead visto no console sai das notificacoes", async () => {
    const gestor = await login("gestor")
    assert.equal((await gestor.request("/sdr")).status, 200)
    const { items } = await (await gestor.request("/api/notifications")).json().then((body) => body.notifications)
    assert.ok(!items.some((item) => item.kind === "hot-leads"))
  })

  it("outra organizacao nao ve nada", async () => {
    assert.deepEqual(await notificationsOf("outro"), { total: 0, items: [] })
  })
})

describe("cabecalho e tema", () => {
  it("mostra busca, notificacoes e alternancia de tema", async () => {
    const page = await (await (await login("vendedor1")).request("/meu-dia")).text()
    assert.match(page, /aria-label="Buscar"/)
    assert.match(page, /aria-label="Notificações \(3\)"/)
    assert.match(page, /aria-label="Usar tema claro"/)
  })

  it("comeca no tema escuro e respeita o cookie do tema claro", async () => {
    const htmlClass = (page) => page.match(/<html[^>]*class="([^"]*)"/)[1].split(/\s+/)

    const client = await login("gestor")
    assert.ok(htmlClass(await (await client.request("/meu-dia")).text()).includes("dark"))

    client.cookies.set("salesos-theme", "light")
    const light = await (await client.request("/meu-dia")).text()
    assert.ok(!htmlClass(light).includes("dark"))
    assert.match(light, /aria-label="Usar tema escuro"/)

    const loginPage = await (await new Client().request("/login")).text()
    assert.ok(htmlClass(loginPage).includes("dark"))
  })
})
