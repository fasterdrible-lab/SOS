// Testa o Meu Dia e as metas (Tarefa V2-2.1) por HTTP, contra o app e o banco
// de desenvolvimento. Cria apenas registros com o prefixo abaixo, removidos ao
// final. Recusa rodar fora de localhost (tests/support.mjs).
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb, ensurePipelines, legacyColumns } from "./support.mjs"

const PREFIX = "meudia-test-"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORGS = ["org", "org-b", "org-vazia"].map(id)

let month
let saleAtMonthStartIsToday

async function cleanup() {
  await db.query(`delete from organizations where id = any($1)`, [ORGS])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

async function summaryOf(name) {
  const response = await (await login(name)).request("/api/meu-dia")
  assert.equal(response.status, 200)
  return (await response.json()).summary
}

before(async () => {
  await db.connect()
  await cleanup()

  // Limites no fuso de Brasilia, calculados pelo proprio PostgreSQL.
  const { rows } = await db.query(`
    select
      to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM') as month,
      (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as month_start,
      (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as today_start
  `)
  month = rows[0].month
  const monthStart = rows[0].month_start
  const todayStart = rows[0].today_start
  saleAtMonthStartIsToday = monthStart.getTime() === todayStart.getTime()

  for (const organization of ORGS) {
    await db.query(
      `insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`,
      [organization]
    )
  }
  await ensurePipelines(db, ORGS)

  const hash = await bcrypt.hash(PASSWORD, 4)
  for (const [name, organization, role] of [
    ["admin", "org", "CONSULTANT"],
    ["gestor", "org", "MANAGER"],
    ["vendedor1", "org", "MEMBER"],
    ["vendedor2", "org", "MEMBER"],
    ["outro", "org-b", "CONSULTANT"],
    ["vazio", "org-vazia", "CONSULTANT"],
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

  const minute = 60 * 1000
  const day = 24 * 60 * minute
  const now = Date.now()
  const opportunities = [
    // [nome, organizacao, dono, valor, etapa, wonAt, lostAt, stageChangedAt, expectedClose]
    ["v1-ganha-inicio-mes", "org", "vendedor1", 1000, "CLOSED_WON", new Date(monthStart.getTime() + minute)],
    ["v1-ganha-hoje", "org", "vendedor1", 500, "CLOSED_WON", new Date(now)],
    // 30 minutos antes do mes em Brasilia: ja e o dia 1 em UTC, mas pertence ao mes anterior.
    ["v1-ganha-mes-anterior", "org", "vendedor1", 9999, "CLOSED_WON", new Date(monthStart.getTime() - 30 * minute)],
    ["v1-perdida", "org", "vendedor1", 100, "CLOSED_LOST", null, new Date(now)],
    ["v1-proposta", "org", "vendedor1", 2000, "PROPOSAL", null, null, new Date(now - 3 * day)],
    ["v1-esfriando", "org", "vendedor1", 3000, "NEGOTIATION", null, null, new Date(now - 20 * day)],
    ["v1-fechamento-vencido", "org", "vendedor1", 700, "PROSPECTING", null, null, new Date(now), new Date(todayStart.getTime() - day)],
    ["v2-ganha", "org", "vendedor2", 2500, "CLOSED_WON", new Date(now)],
    ["v2-perdida", "org", "vendedor2", 100, "CLOSED_LOST", null, new Date(now)],
    ["b-ganha", "org-b", "outro", 99999, "CLOSED_WON", new Date(now)],
  ]
  // As colunas sao `timestamp` sem fuso, em UTC (como o Prisma grava). Um Date
  // passado direto ao pg iria no horario local da maquina; ISO com Z fica em UTC.
  const utc = (date) => date?.toISOString() ?? null

  for (const [name, organization, owner, value, stage, wonAt = null, lostAt = null, stageChangedAt = utc(new Date(now)), expectedClose = null] of opportunities.map(
    ([name, organization, owner, value, stage, ...dates]) => [name, organization, owner, value, stage, ...dates.map(utc)]
  )) {
    await db.query(
      `insert into opportunities (id, "organizationId", "ownerId", title, value, "pipelineId", "stageId", status,
         "wonAt", "lostAt", "stageChangedAt", "expectedClose", "lostReason", "updatedAt")
       values ($1, $2, $3, $1, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())`,
      [id(name), id(organization), id(owner), value, ...legacyColumns(id(organization), stage), wonAt, lostAt,
        stageChangedAt, expectedClose, stage === "CLOSED_LOST" ? "Teste" : null]
    )
  }

  for (const [scope, amount] of [["ORG", 10000], [id("vendedor1"), 4000]]) {
    await db.query(
      `insert into sales_goals (id, "organizationId", "userId", "scopeKey", month, amount, "updatedAt")
       values ($1, $2, $3, $4, $5, $6, now())`,
      [id(`meta-${scope}`), id("org"), scope === "ORG" ? null : scope, scope, month, amount]
    )
  }
})

after(async () => {
  await cleanup()
  await db.end()
})

describe("indicadores do vendedor", () => {
  it("usam apenas as proprias vendas, no mes de Brasilia", async () => {
    const summary = await summaryOf("vendedor1")

    assert.equal(summary.scope, "OWN")
    assert.equal(summary.month, month)
    assert.equal(summary.goal.revenue, 1500)
    assert.equal(summary.wonCount, 2)
    assert.equal(summary.lostCount, 1)
    assert.equal(summary.conversionRate, 66.67)
    assert.equal(summary.averageTicket, 750)
  })

  it("comparam com a meta individual", async () => {
    const { goal } = await summaryOf("vendedor1")
    assert.equal(goal.goal, 4000)
    assert.equal(goal.percent, 37.5)
    assert.equal(goal.remaining, 2500)
    assert.ok(goal.businessDays.total >= 20 && goal.businessDays.total <= 23)
  })

  it("contam as vendas de hoje", async () => {
    const { salesToday } = await summaryOf("vendedor1")
    assert.deepEqual(
      salesToday,
      saleAtMonthStartIsToday ? { count: 2, revenue: 1500 } : { count: 1, revenue: 500 }
    )
  })

  it("listam propostas, negociacoes esfriando e fechamentos vencidos", async () => {
    const summary = await summaryOf("vendedor1")

    assert.deepEqual(summary.proposals.items.map((item) => item.id), [id("v1-proposta")])
    assert.equal(summary.proposals.items[0].daysInStage, 3)
    assert.deepEqual(summary.cooling.items.map((item) => item.id), [id("v1-esfriando")])
    assert.equal(summary.cooling.items[0].daysInStage, 20)
    assert.deepEqual(summary.overdueClose.items.map((item) => item.id), [id("v1-fechamento-vencido")])
    assert.equal(summary.hotLeads, null)
  })

  it("sem meta individual, mostram so o realizado", async () => {
    const summary = await summaryOf("vendedor2")
    assert.equal(summary.goal.revenue, 2500)
    assert.equal(summary.goal.goal, null)
    assert.equal(summary.goal.percent, null)
    assert.equal(summary.proposals.total, 0)
  })
})

describe("indicadores do gestor", () => {
  it("somam a organizacao, sem outras organizacoes", async () => {
    const summary = await summaryOf("gestor")

    assert.equal(summary.scope, "ORGANIZATION")
    assert.equal(summary.goal.revenue, 4000)
    assert.equal(summary.goal.goal, 10000)
    assert.equal(summary.goal.percent, 40)
    assert.equal(summary.wonCount, 3)
    assert.equal(summary.lostCount, 2)
    assert.equal(summary.conversionRate, 60)
    assert.equal(summary.hotLeads, 0)
  })

  it("organizacao sem dados nao quebra", async () => {
    const summary = await summaryOf("vazio")
    assert.equal(summary.goal.revenue, 0)
    assert.equal(summary.goal.goal, null)
    assert.equal(summary.conversionRate, null)
    assert.equal(summary.averageTicket, null)
    assert.deepEqual(summary.salesToday, { count: 0, revenue: 0 })

    const page = await (await login("vazio")).request("/meu-dia")
    assert.equal(page.status, 200)
    assert.match(await page.text(), /Nenhuma meta definida/)
  })
})

describe("metas", () => {
  const put = (client, body) => client.json("/api/goals", "PUT", body)

  it("vendedor nao define metas", async () => {
    const vendedor = await login("vendedor1")
    const response = await put(vendedor, { month: "2026-12", amount: 1000 })
    assert.equal(response.status, 403)
  })

  it("gestor define, altera e remove a meta da equipe, com auditoria", async () => {
    const gestor = await login("gestor")

    assert.equal((await put(gestor, { month: "2026-12", amount: 50000 })).status, 200)
    assert.equal((await put(gestor, { month: "2026-12", amount: 60000.5 })).status, 200)

    let { rows } = await db.query(
      `select amount::text, "updatedById" from sales_goals where "organizationId" = $1 and month = '2026-12'`,
      [id("org")]
    )
    assert.deepEqual(rows, [{ amount: "60000.50", updatedById: id("gestor") }])

    const removed = await put(gestor, { month: "2026-12", amount: null })
    assert.deepEqual(await removed.json(), { goal: null })
    ;({ rows } = await db.query(
      `select count(*)::int as total from sales_goals where "organizationId" = $1 and month = '2026-12'`,
      [id("org")]
    ))
    assert.equal(rows[0].total, 0)

    ;({ rows } = await db.query(
      `select action from audit_logs where "organizationId" = $1 and action like 'goal.%' order by "createdAt"`,
      [id("org")]
    ))
    assert.deepEqual(rows.map((row) => row.action), ["goal.saved", "goal.saved", "goal.removed"])
  })

  it("define meta individual apenas para membros da organizacao", async () => {
    const gestor = await login("gestor")
    assert.equal((await put(gestor, { month: "2026-12", userId: id("vendedor2"), amount: 1000 })).status, 200)
    assert.equal((await put(gestor, { month: "2026-12", userId: id("outro"), amount: 1000 })).status, 404)
  })

  it("rejeita mes e valor invalidos", async () => {
    const gestor = await login("gestor")
    const badMonth = await (await put(gestor, { month: "2026-13", amount: 1000 })).json()
    assert.equal(badMonth.code, "BAD_REQUEST")
    assert.ok(badMonth.fields.month)
    assert.equal((await put(gestor, { month: "2026-12", amount: 0 })).status, 400)
  })
})

describe("telas", () => {
  const html = async (name, path) => {
    const response = await (await login(name)).request(path)
    assert.equal(response.status, 200, `${name} ${path}`)
    return response.text()
  }

  it("Meu Dia mostra a meta e o realizado", async () => {
    const page = await html("vendedor1", "/meu-dia")
    assert.match(page, /Sua meta de/)
    assert.match(page, /R\$\s1\.500,00/)
    assert.match(page, /de R\$\s4\.000,00/)
    assert.match(page, /Menu do usuário/)
    assert.ok(!page.includes("Editar metas"))

    const gestor = await html("gestor", "/meu-dia")
    assert.match(gestor, /Editar metas/)
    assert.match(gestor, /R\$\s4\.000,00/)
  })

  it("menu mostra apenas o que o papel pode abrir", async () => {
    const links = (page) => new Set([...page.matchAll(/href="(\/[a-z-]+)"/g)].map((match) => match[1]))

    const vendedor = links(await html("vendedor1", "/meu-dia"))
    for (const href of ["/meu-dia", "/dashboard", "/pipeline", "/empresas", "/clientes"]) {
      assert.ok(vendedor.has(href), `vendedor sem ${href}`)
    }
    for (const href of ["/sdr", "/consultor", "/configuracoes", "/academia"]) {
      assert.ok(!vendedor.has(href), `vendedor com ${href}`)
    }

    const gestor = links(await html("gestor", "/meu-dia"))
    assert.ok(gestor.has("/sdr") && gestor.has("/consultor"))
    assert.ok(!gestor.has("/configuracoes"))

    const admin = links(await html("admin", "/meu-dia"))
    assert.ok(admin.has("/configuracoes"))
  })

  it("todas as paginas abrem com o cabecalho novo", async () => {
    for (const path of ["/dashboard", "/pipeline", "/empresas", "/contatos", "/planos", "/clientes", "/diagnostico"]) {
      const page = await html("admin", path)
      assert.match(page, /Menu do usuário/, path)
    }
  })

  it("entrada leva ao Meu Dia", async () => {
    const admin = await login("admin")
    for (const path of ["/", "/login"]) {
      const response = await admin.request(path)
      assert.ok([302, 303, 307, 308].includes(response.status), path)
      assert.match(response.headers.get("location") ?? "", /\/meu-dia$/, path)
    }
  })
})
