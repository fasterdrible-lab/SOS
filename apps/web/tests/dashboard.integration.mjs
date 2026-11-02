// Testa o Dashboard Executivo (Tarefa V2-3) por HTTP, contra o app e o banco de
// desenvolvimento. Cria apenas registros com o prefixo abaixo, removidos ao
// final. Recusa rodar fora de localhost (tests/support.mjs).
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb } from "./support.mjs"

const PREFIX = "dash-test-"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORGS = ["org", "org-b"].map(id)

async function cleanup() {
  await db.query(`delete from organizations where id = any($1)`, [ORGS])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

async function dashboardOf(name, query = "") {
  const response = await (await login(name)).request(`/api/dashboard${query}`)
  assert.equal(response.status, 200)
  return (await response.json()).dashboard
}

const funnelCounts = (dashboard) => dashboard.funnel.steps.map((step) => step.count)

before(async () => {
  await db.connect()
  await cleanup()

  const { rows } = await db.query(`
    select
      to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM') as month,
      (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as month_start,
      (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as today_start
  `)
  const { month, month_start: monthStart, today_start: todayStart } = rows[0]

  for (const organization of ORGS) {
    await db.query(
      `insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`,
      [organization]
    )
  }

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
    `insert into leads (id, "organizationId", name, source, "updatedAt") values ($1, $2, 'Lead', 'Instagram', now())`,
    [id("lead"), id("org")]
  )

  const minute = 60 * 1000
  const day = 24 * 60 * minute
  const now = Date.now()
  const utc = (time) => (time === null ? null : new Date(time).toISOString())
  // [nome, organizacao, dono, valor, etapa, wonAt, lostAt, motivo, lead, stageChangedAt, expectedClose]
  const opportunities = [
    ["v1-ganha-hoje", "org", "vendedor1", 1000, "CLOSED_WON", now, null, null, id("lead")],
    ["v1-ganha-inicio-mes", "org", "vendedor1", 500, "CLOSED_WON", monthStart.getTime() + minute],
    // 30 minutos antes do mes em Brasilia: ja e o dia 1 em UTC, mas pertence ao mes anterior.
    ["v1-ganha-mes-anterior", "org", "vendedor1", 9999, "CLOSED_WON", monthStart.getTime() - 30 * minute],
    ["v1-perdida", "org", "vendedor1", 300, "CLOSED_LOST", null, now, "Preço"],
    ["v2-ganha", "org", "vendedor2", 2500, "CLOSED_WON", now],
    ["v2-perdida", "org", "vendedor2", 200, "CLOSED_LOST", null, now, " preço "],
    ["v1-aberta-parada", "org", "vendedor1", 3000, "NEGOTIATION", null, null, null, null, now - 20 * day, todayStart.getTime() - day],
    ["b-ganha", "org-b", "outro", 99999, "CLOSED_WON", now],
  ]
  for (const [name, organization, owner, value, stage, wonAt = null, lostAt = null, reason = null, leadId = null, stageChangedAt = now, expectedClose = null] of opportunities) {
    await db.query(
      `insert into opportunities (id, "organizationId", "ownerId", "leadId", title, value, stage, "wonAt", "lostAt",
         "lostReason", "stageChangedAt", "expectedClose", "updatedAt")
       values ($1, $2, $3, $4, $1, $5, $6, $7, $8, $9, $10, $11, now())`,
      [id(name), id(organization), id(owner), leadId, value, stage, utc(wonAt), utc(lostAt), reason,
        utc(stageChangedAt), utc(expectedClose)]
    )
  }

  let entry = 0
  for (const [opportunity, organization, stages] of [
    ["v1-ganha-hoje", "org", ["PROSPECTING", "PROPOSAL", "CLOSED_WON"]],
    ["v2-ganha", "org", ["CLOSED_WON"]],
    ["v1-perdida", "org", ["PROSPECTING", "CLOSED_LOST"]],
    ["b-ganha", "org-b", ["PROSPECTING", "CLOSED_WON"]],
  ]) {
    for (const stage of stages) {
      await db.query(
        `insert into opportunity_stage_history (id, "organizationId", "opportunityId", "toStage", "changedAt")
         values ($1, $2, $3, $4, now())`,
        [id(`historico-${entry++}`), id(organization), id(opportunity), stage]
      )
    }
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

describe("visao da organizacao (gestor)", () => {
  it("soma as vendas do mes de Brasilia, sem outras organizacoes", async () => {
    const dashboard = await dashboardOf("gestor")
    assert.equal(dashboard.scope, "ORGANIZATION")
    assert.equal(dashboard.period.key, "mes")
    assert.equal(dashboard.revenue.value, 4000)
    assert.equal(dashboard.wonCount.value, 3)
    assert.equal(dashboard.averageTicket.value, 1333.33)
    assert.equal(dashboard.winRate.value, 60)
    assert.equal(dashboard.winRate.lost, 2)
    assert.equal(dashboard.pace.revenue, 4000)
    assert.equal(dashboard.pace.goal, 10000)
  })

  it("monta o funil pelo historico de etapas do periodo", async () => {
    const dashboard = await dashboardOf("gestor")
    assert.deepEqual(funnelCounts(dashboard), [3, 2, 2, 2, 2])
    assert.equal(dashboard.funnel.leads, 1)
  })

  it("mostra a saude do pipeline aberto", async () => {
    const { health } = await dashboardOf("gestor")
    assert.equal(health.openCount, 1)
    assert.equal(health.openValue, 3000)
    assert.equal(health.cooling, 1)
    assert.equal(health.overdueClose, 1)
  })

  it("agrupa origens e motivos de perda", async () => {
    const { origins, lossReasons } = await dashboardOf("gestor")
    assert.deepEqual(
      origins.groups.map((group) => [group.label, group.count, group.value]),
      [["Sem origem", 2, 3000], ["Instagram", 1, 1000]]
    )
    assert.deepEqual(
      lossReasons.groups.map((group) => [group.label, group.count, group.value]),
      [["Preço", 2, 500]]
    )
  })

  it("lista o time e as metas do mes", async () => {
    const { team, goals } = await dashboardOf("gestor")
    assert.deepEqual(
      team.map((row) => [row.userId, row.won, row.lost, row.revenue, row.goalPercent]),
      [
        [id("vendedor2"), 1, 1, 2500, null],
        [id("vendedor1"), 2, 1, 1500, 37.5],
      ]
    )
    assert.deepEqual(
      goals.rows.map((row) => [row.name, row.progress.goal, row.progress.revenue]),
      [["Equipe", 10000, 4000], [id("vendedor1"), 4000, 1500]]
    )
  })

  it("mes anterior usa o fuso de Brasilia", async () => {
    const dashboard = await dashboardOf("gestor", "?periodo=mes-anterior")
    assert.equal(dashboard.period.key, "mes-anterior")
    assert.equal(dashboard.revenue.value, 9999)
    assert.equal(dashboard.wonCount.value, 1)
  })
})

describe("filtro por vendedor", () => {
  it("gestor ve um vendedor so", async () => {
    const dashboard = await dashboardOf("gestor", `?vendedor=${id("vendedor2")}`)
    assert.equal(dashboard.scope, "SELLER")
    assert.equal(dashboard.revenue.value, 2500)
    assert.deepEqual(dashboard.team.map((row) => row.userId), [id("vendedor2")])
    assert.equal(dashboard.funnel.leads, null)
  })

  it("vendedor de outra organizacao e recusado", async () => {
    const gestor = await login("gestor")
    const response = await gestor.request(`/api/dashboard?vendedor=${id("outro")}`)
    assert.equal(response.status, 404)
    assert.equal((await response.json()).code, "NOT_FOUND")
  })
})

describe("visao do vendedor", () => {
  it("ve apenas os proprios numeros, mesmo pedindo outro vendedor", async () => {
    for (const query of ["", `?vendedor=${id("vendedor2")}`]) {
      const dashboard = await dashboardOf("vendedor1", query)
      assert.equal(dashboard.scope, "OWN")
      assert.equal(dashboard.revenue.value, 1500)
      assert.equal(dashboard.team, null)
      assert.equal(dashboard.funnel.leads, null)
      assert.deepEqual(funnelCounts(dashboard), [2, 1, 1, 1, 1])
      assert.deepEqual(
        dashboard.goals.rows.map((row) => [row.progress.goal, row.progress.revenue]),
        [[4000, 1500]]
      )
    }
  })
})

describe("tela", () => {
  it("gestor ve filtros de periodo e vendedor; vendedor so o periodo", async () => {
    const gestor = await (await (await login("gestor")).request("/dashboard?periodo=90-dias")).text()
    assert.match(gestor, /Funil do período/)
    assert.match(gestor, /Toda a equipe/)
    assert.match(gestor, /Últimos 90 dias/)

    const vendedor = await (await (await login("vendedor1")).request("/dashboard")).text()
    assert.match(vendedor, /Suas negociações/)
    assert.ok(!vendedor.includes("Toda a equipe"))
  })

  it("exige sessao", async () => {
    const response = await new Client().request("/api/dashboard")
    assert.ok([401, 302, 307].includes(response.status))
  })
})
