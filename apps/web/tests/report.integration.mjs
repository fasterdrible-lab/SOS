// Testa o Report Diario (Tarefa V2-8.1) por HTTP, contra o app e o banco de
// desenvolvimento: numeros do dia, escopo do papel, fechamento, dias fechados,
// Meu Dia e telas. Os dados sao de hoje e de ontem no fuso de Brasilia; perto da
// meia-noite os numeros podem cair no dia seguinte. Cria apenas registros com o
// prefixo abaixo, removidos ao final. Recusa rodar fora de localhost (tests/support.mjs).
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb, ensurePipelines, legacyColumns, stageIdOf } from "./support.mjs"

const PREFIX = "report-test-"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORG = id("org")
const ORG_B = id("org-b")

const dayOf = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
const NOW = new Date()
const TODAY = dayOf(NOW)
const YESTERDAY_AT = new Date(NOW.getTime() - 24 * 60 * 60 * 1000)
const YESTERDAY = dayOf(YESTERDAY_AT)
const TOMORROW = dayOf(new Date(NOW.getTime() + 24 * 60 * 60 * 1000))

async function cleanup() {
  await db.query(`delete from activities where "organizationId" = any($1)`, [[ORG, ORG_B]])
  await db.query(`delete from organizations where id = any($1)`, [[ORG, ORG_B]])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

const json = async (response) => ({ status: response.status, body: await response.json() })
const report = async (name, query = "") => json(await (await login(name)).request(`/api/reports/daily${query}`))
const close = async (name, body) => json(await (await login(name)).json("/api/reports/daily", "POST", body))
const closedList = async (name, query = "") =>
  json(await (await login(name)).request(`/api/reports/daily/closed${query}`))

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

  // Atividades: concluidas hoje, pendente hoje e reuniao de ontem.
  for (const [name, owner, type, completedAt, dueDate] of [
    ["reuniao-hoje", "vendedor1", "MEETING", NOW, NOW],
    ["fup-hoje", "vendedor1", "FOLLOW_UP", NOW, NOW],
    ["ligacao-hoje", "vendedor1", "CALL", NOW, null],
    ["tarefa-hoje", "vendedor1", "TASK", NOW, null],
    ["pendente-hoje", "vendedor1", "EMAIL", null, NOW],
    ["reuniao-ontem", "vendedor1", "MEETING", YESTERDAY_AT, YESTERDAY_AT],
    ["reuniao-v2", "vendedor2", "MEETING", NOW, NOW],
  ]) {
    await db.query(
      `insert into activities (id, "organizationId", "ownerId", type, title, "dueDate", "completedAt", "updatedAt")
       values ($1, $2, $3, $4, $1, $5, $6, now())`,
      // Texto ISO em UTC: um Date iria como hora local para a coluna sem fuso.
      [id(name), ORG, id(owner), type, dueDate?.toISOString() ?? null, completedAt?.toISOString() ?? null]
    )
  }

  for (const name of ["avanca", "ganha"]) {
    await db.query(
      `insert into opportunities (id, "organizationId", "ownerId", title, value, "pipelineId", "stageId", status, "updatedAt")
       values ($1, $2, $3, $1, 1500, $4, $5, $6, now())`,
      [id(name), ORG, id("vendedor1"), ...legacyColumns(ORG, "PROSPECTING")]
    )
  }

  // Avancar e ganhar pela API, para gerar o historico como a tela gera.
  const seller = await login("vendedor1")
  const moved = await seller.json(`/api/opportunities/${id("avanca")}`, "PATCH", { stageId: stageIdOf(ORG, "QUALIFICATION") })
  assert.equal(moved.status, 200)
  const won = await seller.json(`/api/opportunities/${id("ganha")}`, "PATCH", { status: "WON" })
  assert.equal(won.status, 200)
})

after(async () => {
  await cleanup()
  await db.end()
})

describe("numeros do dia", () => {
  it("conta reunioes, FUPs, avancadas, vendas e pendentes do proprio dia", async () => {
    const { status, body } = await report("vendedor1")
    assert.equal(status, 200)
    assert.equal(body.report.day, TODAY)
    assert.equal(body.report.userId, id("vendedor1"))
    assert.deepEqual(body.report.live, {
      meetingsDone: 1,
      saleiaMeetings: 0,
      followUpsDone: 2,
      advancedDeals: 1,
      salesCount: 1,
      salesRevenue: 1500,
      pendingCount: 1,
    })
    assert.equal(body.report.closed, null)
    assert.deepEqual(body.report.lists.advanced.map((item) => item.id), [id("avanca")])
    assert.deepEqual(body.report.lists.pending.map((item) => item.id), [id("pendente-hoje")])
  })

  it("outro dia e dia futuro", async () => {
    const yesterday = (await report("vendedor1", `?dia=${YESTERDAY}`)).body.report
    assert.equal(yesterday.day, YESTERDAY)
    assert.equal(yesterday.live.meetingsDone, 1)
    assert.equal(yesterday.live.salesCount, 0)
    assert.equal((await report("vendedor1", `?dia=${TOMORROW}`)).body.report.day, TODAY)
  })

  it("vendedor so ve o proprio dia; gestor escolhe a pessoa", async () => {
    assert.equal((await report("vendedor1", `?vendedor=${id("vendedor2")}`)).body.report.userId, id("vendedor1"))
    const other = (await report("gestor", `?vendedor=${id("vendedor2")}`)).body.report
    assert.equal(other.userId, id("vendedor2"))
    assert.equal(other.live.meetingsDone, 1)
    assert.equal(other.live.salesCount, 0)
    assert.equal((await report("gestor", `?vendedor=${id("outro")}`)).status, 404)
  })

  it("exige sessao", async () => {
    assert.ok([401, 302, 307].includes((await new Client().request("/api/reports/daily")).status))
  })
})

describe("fechamento", () => {
  it("recusa data invalida e dia futuro", async () => {
    assert.equal((await close("vendedor1", { day: "2026-13-01" })).status, 400)
    assert.equal((await close("vendedor1", { day: TOMORROW })).status, 422)
  })

  it("fecha hoje com os numeros de agora, uma unica vez, auditado", async () => {
    const closed = await close("vendedor1", { notes: "  Cliente pediu desconto  " })
    assert.equal(closed.status, 201)
    assert.equal(closed.body.report.day, TODAY)
    assert.equal(closed.body.report.notes, "Cliente pediu desconto")
    assert.equal(closed.body.report.meetingsDone, 1)
    assert.equal(closed.body.report.pendingCount, 1)
    assert.equal(closed.body.report.salesRevenue, 1500)

    assert.equal((await close("vendedor1", {})).status, 409)

    const audit = await db.query(
      `select action, metadata from audit_logs where "organizationId" = $1 and action = 'daily-report.closed'`,
      [ORG]
    )
    assert.equal(audit.rows.length, 1)
    assert.deepEqual(audit.rows[0].metadata, { day: TODAY })
  })

  it("fechado nao muda: o retrato fica, o dia ao vivo continua", async () => {
    await db.query(`update activities set "completedAt" = now() where id = $1`, [id("pendente-hoje")])
    const { closed, live } = (await report("vendedor1")).body.report
    assert.equal(closed.pendingCount, 1)
    assert.equal(closed.followUpsDone, 2)
    assert.equal(live.pendingCount, 0)
    assert.equal(live.followUpsDone, 3)
  })

  it("fecha um dia passado esquecido", async () => {
    const closed = await close("vendedor1", { day: YESTERDAY })
    assert.equal(closed.status, 201)
    assert.equal(closed.body.report.meetingsDone, 1)
  })

  it("cada pessoa fecha o proprio dia", async () => {
    const closed = await close("gestor", { day: TODAY })
    assert.equal(closed.status, 201)
    assert.equal(closed.body.report.userId, id("gestor"))
    assert.equal((await report("gestor", `?vendedor=${id("vendedor2")}`)).body.report.closed, null)
  })
})

describe("dias fechados", () => {
  it("vendedor ve os proprios; gestor ve a equipe e filtra", async () => {
    const own = (await closedList("vendedor1")).body.reports
    assert.deepEqual(own.map((item) => item.day), [TODAY, YESTERDAY])
    assert.deepEqual((await closedList("vendedor2")).body.reports, [])
    assert.deepEqual((await closedList("vendedor2", `?vendedor=${id("vendedor1")}`)).body.reports, [])

    const team = (await closedList("gestor")).body.reports
    assert.equal(team.length, 3)
    assert.deepEqual(
      (await closedList("gestor", `?vendedor=${id("vendedor1")}`)).body.reports.map((item) => item.userId),
      [id("vendedor1"), id("vendedor1")]
    )
    assert.equal((await closedList("gestor", `?vendedor=${id("outro")}`)).status, 404)
    assert.deepEqual((await closedList("outro")).body.reports, [])
  })
})

describe("telas", () => {
  const html = async (name, path) => {
    const response = await (await login(name)).request(path)
    assert.equal(response.status, 200, path)
    return response.text()
  }

  it("report, dias fechados, menu e Meu Dia", async () => {
    const closedDay = await html("vendedor1", "/report")
    assert.match(closedDay, /Dia fechado em/)
    assert.match(closedDay, /Cliente pediu desconto/)
    assert.ok(closedDay.includes('href="/report"'))

    const open = await html("vendedor2", "/report")
    assert.match(open, /Fechar o dia/)
    assert.match(open, /Observações do dia/)

    const team = await html("gestor", "/report?aba=fechados")
    assert.match(team, new RegExp(id("vendedor1")))

    const other = await html("gestor", `/report?vendedor=${id("vendedor2")}`)
    assert.match(other, /Cada pessoa fecha o próprio dia/)

    assert.match(await html("vendedor1", "/meu-dia"), /Seu dia foi fechado/)
    assert.match(await html("vendedor2", "/meu-dia"), /Abrir o Report/)
  })
})
