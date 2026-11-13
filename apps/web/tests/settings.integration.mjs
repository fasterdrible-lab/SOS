// Testa as configuracoes comerciais (Tarefa V2-9.3) por HTTP, contra o app e o
// banco de desenvolvimento: quem altera, validacao, dias para "esfriando" no Meu
// Dia, no Dashboard e no sino, e feriados na conta de dias uteis. Cria apenas
// registros com o prefixo abaixo, removidos ao final. Recusa rodar fora de
// localhost (tests/support.mjs).
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb, ensurePipelines, legacyColumns } from "./support.mjs"

const PREFIX = "settings-test-"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORG = id("org")
const ORG_B = id("org-b")

const json = async (response) => ({ status: response.status, body: await response.json() })
const put = async (client, body) => json(await client.json("/api/settings/commercial", "PUT", body))

async function cleanup() {
  await db.query(`delete from organizations where id = any($1)`, [[ORG, ORG_B]])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

/** Primeiro dia de semana do mes corrente (em Brasilia), como AAAA-MM-DD. */
function firstWeekdayOfMonth() {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
    .format(new Date())
    .split("-")
    .map(Number)
  for (let day = 1; day <= 7; day++) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    if (weekday !== 0 && weekday !== 6) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    }
  }
  throw new Error("sem dia de semana")
}

const coolingOf = async (client) => {
  const [day, dashboard, bell] = await Promise.all([
    json(await client.request("/api/meu-dia")),
    json(await client.request("/api/dashboard")),
    json(await client.request("/api/notifications")),
  ])
  return {
    meuDia: day.body.summary.cooling.total,
    dashboard: dashboard.body.dashboard.health.cooling,
    bell: bell.body.notifications.items.find((item) => item.kind === "cooling")?.count ?? 0,
  }
}

before(async () => {
  await db.connect()
  await cleanup()

  for (const organization of [ORG, ORG_B]) {
    await db.query(`insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`, [organization])
  }
  await ensurePipelines(db, [ORG, ORG_B])

  const hash = await bcrypt.hash(PASSWORD, 4)
  for (const [name, organization, role] of [
    ["admin", ORG, "ADMIN"],
    ["gestor", ORG, "MANAGER"],
    ["vendedor", ORG, "MEMBER"],
    ["admin-b", ORG_B, "ADMIN"],
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

  // Parada ha 5 dias: so esfria se o limite for menor que 5.
  for (const organization of [ORG, ORG_B]) {
    await db.query(
      `insert into opportunities (id, "organizationId", "ownerId", title, value, "pipelineId", "stageId", status, "stageChangedAt", "updatedAt")
       values ($1, $2, null, $1, 1000, $3, $4, $5, now() - interval '5 days', now())`,
      [`${organization}-parada`, organization, ...legacyColumns(organization, "PROSPECTING")]
    )
  }
})

after(async () => {
  await cleanup()
  await db.end()
})

describe("configuracoes comerciais: acesso e validacao", () => {
  it("so o administrador le e altera", async () => {
    for (const name of ["gestor", "vendedor"]) {
      const client = await login(name)
      assert.equal((await client.request("/api/settings/commercial")).status, 403, name)
      assert.equal((await put(client, { coolingAfterDays: 3, holidays: [] })).status, 403, name)
    }
    // Sem sessao, o middleware leva ao login.
    assert.equal((await new Client().request("/api/settings/commercial")).status, 307)
  })

  it("sem registro, devolve os padroes", async () => {
    const { status, body } = await json(await (await login("admin")).request("/api/settings/commercial"))
    assert.equal(status, 200)
    assert.deepEqual(body.settings, { coolingAfterDays: 14, holidays: [] })
  })

  it("recusa dias fora do limite e feriado invalido", async () => {
    const admin = await login("admin")
    for (const body of [
      { coolingAfterDays: 0, holidays: [] },
      { coolingAfterDays: 181, holidays: [] },
      { coolingAfterDays: 2.5, holidays: [] },
      { coolingAfterDays: "7", holidays: [] },
      { coolingAfterDays: 7 },
      { coolingAfterDays: 7, holidays: ["2026-02-30"] },
      { coolingAfterDays: 7, holidays: ["25/12/2026"] },
      { coolingAfterDays: 7, holidays: Array.from({ length: 101 }, (_, index) => `2027-01-${String((index % 28) + 1).padStart(2, "0")}`) },
    ]) {
      assert.equal((await put(admin, body)).status, 400, JSON.stringify(body).slice(0, 60))
    }
    const { body } = await json(await admin.request("/api/settings/commercial"))
    assert.deepEqual(body.settings, { coolingAfterDays: 14, holidays: [] })
  })
})

describe("configuracoes comerciais: efeito", () => {
  it("o limite de dias muda o que esfria no Meu Dia, no Dashboard e no sino", async () => {
    const admin = await login("admin")
    assert.deepEqual(await coolingOf(admin), { meuDia: 0, dashboard: 0, bell: 0 })

    const saved = await put(admin, { coolingAfterDays: 3, holidays: [] })
    assert.equal(saved.status, 200)
    assert.deepEqual(saved.body.changed, ["coolingAfterDays"])
    assert.deepEqual(await coolingOf(admin), { meuDia: 1, dashboard: 1, bell: 1 })

    const day = await json(await admin.request("/api/meu-dia"))
    assert.equal(day.body.summary.coolingAfterDays, 3)
    assert.match(await (await admin.request("/meu-dia")).text(), /há mais de (<!-- -->)?3(<!-- -->)? dias/)
    assert.match(await (await admin.request("/dashboard")).text(), /paradas há mais de (<!-- -->)?3(<!-- -->)? dias/)

    // Vale para todos os papeis da organizacao, e so para ela.
    assert.equal((await coolingOf(await login("gestor"))).meuDia, 1)
    assert.deepEqual(await coolingOf(await login("admin-b")), { meuDia: 0, dashboard: 0, bell: 0 })
  })

  it("feriado em dia de semana tira um dia util do mes", async () => {
    const admin = await login("admin")
    const before = (await json(await admin.request("/api/meu-dia"))).body.summary.goal.businessDays
    const holiday = firstWeekdayOfMonth()

    const saved = await put(admin, { coolingAfterDays: 3, holidays: [holiday, "2030-12-25", holiday] })
    assert.equal(saved.status, 200)
    assert.deepEqual(saved.body.settings.holidays, [holiday, "2030-12-25"])
    assert.deepEqual(saved.body.changed, ["holidays"])

    const after = (await json(await admin.request("/api/meu-dia"))).body.summary.goal.businessDays
    assert.equal(after.total, before.total - 1)
    const dashboard = await json(await admin.request("/api/dashboard"))
    assert.equal(dashboard.body.dashboard.pace.businessDays.total, before.total - 1)

    // A outra organizacao continua com o calendario dela.
    const other = (await json(await (await login("admin-b")).request("/api/meu-dia"))).body.summary.goal.businessDays
    assert.equal(other.total, before.total)
  })

  it("gravar sem mudar nao audita; a tela mostra o que esta salvo", async () => {
    const admin = await login("admin")
    const current = (await json(await admin.request("/api/settings/commercial"))).body.settings
    const same = await put(admin, current)
    assert.equal(same.status, 200)
    assert.deepEqual(same.body.changed, [])

    const audit = await db.query(
      `select metadata from audit_logs where "organizationId" = $1 and action = 'settings.commercial-updated' order by "createdAt"`,
      [ORG]
    )
    assert.deepEqual(audit.rows.map((row) => row.metadata.fields), [["coolingAfterDays"], ["holidays"]])

    const page = await (await admin.request("/configuracoes/comercial")).text()
    assert.match(page, /Configurações comerciais/)
    assert.match(page, /Feriados \((<!-- -->)?2/)
    assert.match(page, /value="3"/)

    const denied = await (await (await login("gestor")).request("/configuracoes/comercial")).text()
    assert.match(denied, /Acesso restrito/)
  })
})
