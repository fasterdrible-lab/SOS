// Testa a integracao SALEIA (Tarefa V2-7.1) por HTTP, contra o app e o banco de
// desenvolvimento: conexao, recebimento assinado, vinculo, escopo e telas. Cria
// apenas registros com o prefixo abaixo, removidos ao final. Recusa rodar fora de
// localhost (tests/support.mjs).
import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { BASE_URL, Client, PASSWORD, createDb, ensurePipelines, legacyColumns } from "./support.mjs"

const PREFIX = "saleia-test-"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORG = id("org")
const ORG_B = id("org-b")

let secret

async function cleanup() {
  await db.query(`delete from organizations where id = any($1)`, [[ORG, ORG_B]])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

const now = () => String(Math.floor(Date.now() / 1000))
const sign = (key, timestamp, body) =>
  `sha256=${createHmac("sha256", key).update(`${timestamp}.${body}`).digest("hex")}`

/** Envia o evento como o SALE-IA enviaria, sem sessao. */
function send(body, { organizationId = ORG, key = secret, timestamp = now(), signature, headers = {} } = {}) {
  const raw = typeof body === "string" ? body : JSON.stringify(body)
  return fetch(`${BASE_URL}/api/integrations/saleia/${organizationId}/events`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      "x-saleia-timestamp": timestamp,
      "x-saleia-signature": signature ?? sign(key, timestamp, raw),
      ...headers,
    },
    body: raw,
  })
}

function event(externalId, overrides = {}) {
  const { meeting, ...rest } = overrides
  return {
    version: 1,
    event: "meeting.analyzed",
    eventId: `${externalId}-${Date.now()}`,
    occurredAt: new Date().toISOString(),
    meeting: {
      externalId,
      title: `Reuniao ${externalId}`,
      startedAt: "2026-11-05T14:00:00.000Z",
      durationMinutes: 45,
      participants: [],
      summary: `Resumo da ${externalId}`,
      ...meeting,
    },
    links: {},
    insights: [],
    ...rest,
  }
}

const json = async (response) => ({ status: response.status, body: await response.json() })
const titles = async (name, query = "") => {
  const response = await (await login(name)).request(`/api/saleia/meetings${query}`)
  assert.equal(response.status, 200)
  return (await response.json()).meetings.map((meeting) => meeting.title)
}
const meetingOf = async (externalId) =>
  (await db.query(`select * from saleia_meetings where "organizationId" = $1 and "externalId" = $2`, [ORG, externalId])).rows[0]

before(async () => {
  await db.connect()
  await cleanup()

  for (const organization of [ORG, ORG_B]) {
    await db.query(`insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`, [organization])
  }
  await ensurePipelines(db, [ORG, ORG_B])

  const hash = await bcrypt.hash(PASSWORD, 4)
  for (const [name, organization, role] of [
    ["admin", ORG, "CONSULTANT"],
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

  for (const [name, organization] of [["Acme", ORG], ["Beta", ORG], ["Alheia", ORG_B]]) {
    await db.query(
      `insert into companies (id, "organizationId", name, "updatedAt") values ($1, $2, $3, now())`,
      [id(name.toLowerCase()), organization, `${PREFIX}${name}`]
    )
  }
  await db.query(
    `insert into contacts (id, "organizationId", "companyId", name, email, "updatedAt") values ($1, $2, $3, 'Ana', $4, now())`,
    [id("ana"), ORG, id("acme"), "Ana@Acme.test"]
  )

  for (const [name, organization, owner, company] of [
    ["v1-negocio", ORG, "vendedor1", "acme"],
    ["v2-a", ORG, "vendedor2", "beta"],
    ["v2-b", ORG, "vendedor2", "beta"],
    ["alheia-negocio", ORG_B, "outro", "alheia"],
  ]) {
    await db.query(
      `insert into opportunities (id, "organizationId", "ownerId", "companyId", title, value, "pipelineId", "stageId", status, "updatedAt")
       values ($1, $2, $3, $4, $1, 1000, $5, $6, $7, now())`,
      [id(name), organization, id(owner), id(company), ...legacyColumns(organization, "PROPOSAL")]
    )
  }
})

after(async () => {
  await cleanup()
  await db.end()
})

describe("conexao", () => {
  it("so o administrador conecta", async () => {
    for (const name of ["gestor", "vendedor1"]) {
      const client = await login(name)
      assert.equal((await client.request("/api/settings/saleia")).status, 403, name)
      assert.equal((await client.request("/api/settings/saleia", { method: "POST" })).status, 403, name)
    }
  })

  it("gera o segredo uma vez e nao o devolve depois", async () => {
    const admin = await login("admin")
    const created = await json(await admin.request("/api/settings/saleia", { method: "POST" }))
    assert.equal(created.status, 201)
    assert.match(created.body.secret, /^slia_/)
    assert.equal(created.body.endpoint, `/api/integrations/saleia/${ORG}/events`)
    secret = created.body.secret

    const status = (await json(await admin.request("/api/settings/saleia"))).body
    assert.equal(status.connected, true)
    assert.equal(status.secretHint, secret.slice(-4))
    assert.ok(!JSON.stringify(status).includes(secret))

    const { rows } = await db.query(`select "secretEncrypted" from saleia_integrations where "organizationId" = $1`, [ORG])
    assert.ok(!rows[0].secretEncrypted.includes(secret))
  })

  it("novo segredo invalida o anterior, com auditoria sem o segredo", async () => {
    const old = secret
    const rotated = await json(await (await login("admin")).request("/api/settings/saleia", { method: "POST" }))
    assert.equal(rotated.status, 200)
    secret = rotated.body.secret
    assert.notEqual(secret, old)

    assert.equal((await send(event("antiga"), { key: old })).status, 401)
    assert.equal((await send(event("nova"))).status, 201)

    const { rows } = await db.query(
      `select action, metadata::text from audit_logs where "organizationId" = $1 and action like 'saleia.%' order by "createdAt"`,
      [ORG]
    )
    assert.deepEqual(rows.map((row) => row.action), ["saleia.connected", "saleia.secret-rotated"])
    assert.ok(rows.every((row) => !String(row.metadata).includes("slia_")))
  })
})

describe("recebimento", () => {
  it("recusa assinatura ausente, errada, antiga ou de organizacao sem conexao", async () => {
    const body = event("recusada")
    assert.equal((await send(body, { signature: "" })).status, 401)
    assert.equal((await send(body, { key: "slia_errado" })).status, 401)
    const old = String(Math.floor(Date.now() / 1000) - 600)
    assert.equal((await send(body, { timestamp: old })).status, 401)
    assert.equal((await send(body, { organizationId: ORG_B })).status, 401)
    assert.equal((await send(body, { organizationId: id("inexistente") })).status, 401)
    assert.equal(await meetingOf("recusada"), undefined)
  })

  it("recusa JSON, versao, insight e tamanho invalidos", async () => {
    assert.equal((await send("{nao e json")).status, 400)
    assert.equal((await send(event("v2", { version: 2 }))).status, 400)
    const semEtapa = event("sem-etapa", { insights: [{ kind: "STAGE_SUGGESTION", text: "Avancar" }] })
    assert.equal((await send(semEtapa)).status, 400)
    const grande = event("grande", { meeting: { summary: "x".repeat(300 * 1024) } })
    assert.equal((await send(grande)).status, 400)
  })

  it("liga pelo e-mail do participante e grava os insights", async () => {
    const result = await json(
      await send(
        event("acme-1", {
          meeting: { participants: [{ name: "Ana", email: "ANA@acme.test" }, { name: "Vendedor" }] },
          insights: [
            { kind: "RECOMMENDATION", text: "Enviar proposta revisada", dueDate: "2026-11-10T12:00:00.000Z" },
            { kind: "OBJECTION", text: "Preco acima do orcamento", quote: "Esta caro para nos" },
            { kind: "STAGE_SUGGESTION", text: "Cliente pediu proposta", stageName: "Proposta" },
          ],
        })
      )
    )
    assert.equal(result.status, 201)
    assert.deepEqual(result.body.linked, {
      opportunityId: id("v1-negocio"),
      companyId: id("acme"),
      contactId: id("ana"),
      via: "contact",
    })
    const { rows } = await db.query(`select kind from saleia_insights where "meetingId" = $1 order by position`, [result.body.meetingId])
    assert.deepEqual(rows.map((row) => row.kind), ["RECOMMENDATION", "OBJECTION", "STAGE_SUGGESTION"])
  })

  it("reenviar atualiza a mesma reuniao e preserva o que uma pessoa ja decidiu", async () => {
    const meeting = await meetingOf("acme-1")
    await db.query(`update saleia_insights set status = 'ACCEPTED' where "meetingId" = $1 and kind = 'OBJECTION'`, [meeting.id])

    const again = await json(
      await send(
        event("acme-1", {
          meeting: { title: "Reuniao acme-1 revista", participants: [{ name: "Ana", email: "ana@acme.test" }] },
          insights: [{ kind: "PAIN", text: "Processo manual demorado" }],
        })
      )
    )
    assert.equal(again.status, 200)
    assert.equal(again.body.meetingId, meeting.id)

    const { rows } = await db.query(`select kind, status from saleia_insights where "meetingId" = $1 order by kind`, [meeting.id])
    assert.deepEqual(rows, [
      { kind: "OBJECTION", status: "ACCEPTED" },
      { kind: "PAIN", status: "OPEN" },
    ])
    const count = await db.query(`select count(*)::int as n from saleia_meetings where "organizationId" = $1 and "externalId" = 'acme-1'`, [ORG])
    assert.equal(count.rows[0].n, 1)
    assert.equal((await meetingOf("acme-1")).title, "Reuniao acme-1 revista")
  })

  it("negociacao informada prevalece; de outra organizacao e ignorada", async () => {
    const direct = await json(await send(event("direta", { links: { opportunityId: id("v2-a") } })))
    assert.equal(direct.body.linked.opportunityId, id("v2-a"))
    assert.equal(direct.body.linked.via, "opportunity")

    const foreign = await json(await send(event("estrangeira", { links: { opportunityId: id("alheia-negocio") } })))
    assert.deepEqual(foreign.body.linked, { opportunityId: null, companyId: null, contactId: null, via: null })
  })

  it("pelo nome da empresa, sem escolher entre duas negociacoes", async () => {
    const byName = await json(await send(event("beta-nome", { links: { companyName: `${PREFIX}BETA` } })))
    assert.deepEqual(byName.body.linked, { opportunityId: null, companyId: id("beta"), contactId: null, via: "company" })
    const foreign = await json(await send(event("nome-alheio", { links: { companyName: `${PREFIX}Alheia` } })))
    assert.equal(foreign.body.linked.companyId, null)
  })
})

describe("visibilidade", () => {
  it("gestor ve todas e filtra as sem empresa", async () => {
    const all = await titles("gestor")
    for (const title of ["Reuniao acme-1 revista", "Reuniao direta", "Reuniao estrangeira", "Reuniao beta-nome"]) {
      assert.ok(all.includes(title), title)
    }
    const unlinked = await titles("gestor", "?vinculo=sem")
    assert.ok(unlinked.includes("Reuniao estrangeira"))
    assert.ok(!unlinked.includes("Reuniao acme-1 revista"))
  })

  it("vendedor ve so as das proprias negociacoes", async () => {
    assert.deepEqual(await titles("vendedor1"), ["Reuniao acme-1 revista"])
    assert.deepEqual(await titles("vendedor2"), ["Reuniao direta"])
    // A reuniao "direta" herdou a empresa da negociacao; as sem empresa nao tem negociacao.
    assert.deepEqual(await titles("vendedor2", "?vinculo=sem"), [])
    assert.deepEqual(await titles("outro"), [])

    const meeting = await meetingOf("acme-1")
    assert.equal((await (await login("vendedor2")).request(`/api/saleia/meetings/${meeting.id}`)).status, 404)
    assert.equal((await (await login("outro")).request(`/api/saleia/meetings/${meeting.id}`)).status, 404)
    const detail = await json(await (await login("vendedor1")).request(`/api/saleia/meetings/${meeting.id}`))
    assert.equal(detail.status, 200)
    assert.deepEqual(detail.body.meeting.insights.map((insight) => insight.kind), ["OBJECTION", "PAIN"])
  })

  it("exige sessao para ler", async () => {
    assert.ok([401, 302, 307].includes((await new Client().request("/api/saleia/meetings")).status))
  })
})

describe("telas", () => {
  const html = async (name, path) => {
    const response = await (await login(name)).request(path)
    assert.equal(response.status, 200, path)
    return response.text()
  }

  it("lista, detalhe e menu", async () => {
    const meeting = await meetingOf("acme-1")
    const list = await html("gestor", "/saleia")
    assert.match(list, /Reuniao acme-1 revista/)
    assert.match(list, /Reuniao estrangeira/)
    assert.ok(list.includes('href="/saleia"'))

    const detail = await html("vendedor1", `/saleia/${meeting.id}`)
    assert.match(detail, /Resumo da acme-1/)
    assert.match(detail, /Esta caro para nos/)
    assert.match(detail, /Processo manual demorado/)

    assert.ok(!(await html("vendedor2", "/saleia")).includes("Reuniao acme-1 revista"))
  })

  it("empresa e negociacao mostram as reunioes", async () => {
    assert.match(await html("vendedor1", `/empresas/${id("acme")}`), /Reuniao acme-1 revista/)
    assert.match(await html("vendedor1", `/pipeline/${id("v1-negocio")}`), /Reuniao acme-1 revista/)
    assert.ok(!(await html("vendedor2", `/empresas/${id("acme")}`)).includes("Reuniao acme-1 revista"))
  })

  it("configuracoes mostra a conexao ao administrador", async () => {
    const page = await html("admin", "/configuracoes")
    assert.match(page, /Gerar novo segredo/)
    assert.ok(!page.includes(secret))
  })
})

describe("desconexao", () => {
  it("recusa eventos e mantem as reunioes recebidas", async () => {
    const admin = await login("admin")
    assert.equal((await admin.request("/api/settings/saleia", { method: "DELETE" })).status, 200)
    assert.equal((await send(event("depois"))).status, 401)
    assert.ok(await meetingOf("acme-1"))
    assert.equal((await admin.request("/api/settings/saleia", { method: "DELETE" })).status, 404)
  })
})
