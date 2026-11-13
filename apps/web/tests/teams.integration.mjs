// Testa Equipes (Tarefa V2-9.2) por HTTP, contra o app e o banco de
// desenvolvimento: cadastro de equipes, pessoa em uma equipe e a visao do gestor
// com equipe (a equipe e o que esta sem dono) em negociacoes, atividades, busca,
// atribuicao, Dashboard, Report e reunioes do SALEIA. Cria apenas registros com o prefixo abaixo, removidos ao final.
// Recusa rodar fora de localhost (tests/support.mjs).
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb, ensurePipelines, legacyColumns } from "./support.mjs"

const PREFIX = "teams-test-"

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

const json = async (response) => ({ status: response.status, body: await response.json() })

/** Nomes curtos ("a", "orfa") das negociacoes que a pessoa lista. */
async function visibleOpportunities(name) {
  const { status, body } = await json(await (await login(name)).request("/api/opportunities"))
  assert.equal(status, 200)
  const list = Array.isArray(body) ? body : body.opportunities
  return list.map((item) => item.id.replace(id("opp-"), "")).sort()
}

async function visibleActivities(name) {
  const { status, body } = await json(await (await login(name)).request("/api/activities"))
  assert.equal(status, 200)
  return body.activities.map((item) => item.id.replace(id("act-"), "")).sort()
}

const setTeam = async (admin, member, teamId) =>
  json(await admin.json(`/api/settings/members/${id(member)}`, "PATCH", { teamId }))

let teamA
let teamB

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
    ["gestor-a", ORG, "MANAGER"],
    ["gestor-livre", ORG, "MANAGER"],
    ["vend-a", ORG, "MEMBER"],
    ["vend-b", ORG, "MEMBER"],
    ["vend-sem", ORG, "MEMBER"],
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
  // vend-a tambem participa de outra organizacao, la sem equipe: nao pode
  // esconder as negociacoes dele do gestor da equipe A.
  await db.query(
    `insert into organization_members (id, "organizationId", "userId", role) values ($1, $2, $3, 'MEMBER')`,
    [id("vend-a-em-b"), ORG_B, id("vend-a")]
  )

  for (const [name, owner] of [
    ["a", "vend-a"],
    ["b", "vend-b"],
    ["sem", "vend-sem"],
    ["gestor", "gestor-a"],
    ["orfa", null],
  ]) {
    await db.query(
      `insert into opportunities (id, "organizationId", "ownerId", title, value, "pipelineId", "stageId", status, "updatedAt")
       values ($1, $2, $3, $4, 1000, $5, $6, $7, now())`,
      [id(`opp-${name}`), ORG, owner ? id(owner) : null, `${PREFIX}negocio ${name}`, ...legacyColumns(ORG, "PROSPECTING")]
    )
    await db.query(
      `insert into activities (id, "organizationId", "ownerId", type, title, "updatedAt") values ($1, $2, $3, 'TASK', $1, now())`,
      [id(`act-${name}`), ORG, owner ? id(owner) : null]
    )
  }

  for (const [name, opp] of [
    ["a", "a"],
    ["b", "b"],
    ["solta", null],
  ]) {
    await db.query(
      `insert into saleia_meetings (id, "organizationId", "externalId", title, "startedAt", participants, summary, "opportunityId", "analyzedAt", "updatedAt")
       values ($1, $2, $1, $1, now(), '[]', 'Resumo', $3, now(), now())`,
      [id(`reu-${name}`), ORG, opp && id(`opp-${opp}`)]
    )
  }
})

after(async () => {
  await cleanup()
  await db.end()
})

describe("equipes: cadastro", () => {
  it("so administrador cria, renomeia e remove", async () => {
    for (const name of ["gestor-a", "vend-a"]) {
      const client = await login(name)
      assert.equal((await client.request("/api/settings/teams")).status, 403, name)
      assert.equal((await client.json("/api/settings/teams", "POST", { name: "Invasora" })).status, 403, name)
    }
  })

  it("cria com nome unico, renomeia e lista com a contagem de pessoas", async () => {
    const admin = await login("admin")
    const a = await json(await admin.json("/api/settings/teams", "POST", { name: "  Equipe A " }))
    assert.equal(a.status, 201)
    assert.equal(a.body.name, "Equipe A")
    teamA = a.body.id
    teamB = (await json(await admin.json("/api/settings/teams", "POST", { name: "Equipe B" }))).body.id

    assert.equal((await admin.json("/api/settings/teams", "POST", { name: "equipe a" })).status, 409)
    assert.equal((await admin.json("/api/settings/teams", "POST", { name: "x" })).status, 400)
    assert.equal((await admin.json(`/api/settings/teams/${teamB}`, "PATCH", { name: "Equipe A" })).status, 409)
    assert.equal((await admin.json(`/api/settings/teams/${teamB}`, "PATCH", { name: "Equipe Sul" })).status, 200)

    for (const member of ["gestor-a", "vend-a"]) assert.equal((await setTeam(admin, member, teamA)).status, 200)
    assert.equal((await setTeam(admin, "vend-b", teamB)).status, 200)

    const listed = await json(await admin.request("/api/settings/teams"))
    assert.deepEqual(
      listed.body.teams.map((team) => [team.name, team.memberCount]),
      [["Equipe A", 2], ["Equipe Sul", 1]]
    )
    const members = await json(await admin.request("/api/settings/members"))
    assert.equal(members.body.members.find((member) => member.id === id("vend-a")).teamId, teamA)
    assert.equal(members.body.members.find((member) => member.id === id("vend-sem")).teamId, null)

    const page = await (await admin.request("/configuracoes/usuarios")).text()
    assert.match(page, /Equipes \((<!-- -->)?2/)
    assert.match(page, /Equipe Sul/)
  })

  it("equipe de outra organizacao ou inexistente nao entra", async () => {
    const other = await json(await (await login("admin-b")).json("/api/settings/teams", "POST", { name: "Equipe de B" }))
    assert.equal(other.status, 201)
    const admin = await login("admin")
    assert.equal((await setTeam(admin, "vend-sem", other.body.id)).status, 400)
    assert.equal((await setTeam(admin, "admin-b", teamA)).status, 404)
    assert.equal((await admin.json(`/api/settings/teams/${other.body.id}`, "PATCH", { name: "Tomada" })).status, 404)
    assert.equal((await admin.request(`/api/settings/teams/${other.body.id}`, { method: "DELETE" })).status, 404)
    assert.equal((await admin.json(`/api/settings/members/${id("vend-sem")}`, "PATCH", {})).status, 400)
  })
})

describe("equipes: visao do gestor", () => {
  it("gestor com equipe ve a equipe e o que esta sem dono", async () => {
    assert.deepEqual(await visibleOpportunities("gestor-a"), ["a", "gestor", "orfa"])
    assert.deepEqual(await visibleActivities("gestor-a"), ["a", "gestor", "orfa"])
  })

  it("gestor sem equipe, administrador e vendedor continuam como antes", async () => {
    const all = ["a", "b", "gestor", "orfa", "sem"]
    assert.deepEqual(await visibleOpportunities("gestor-livre"), all)
    assert.deepEqual(await visibleOpportunities("admin"), all)
    assert.deepEqual(await visibleActivities("admin"), all)
    assert.deepEqual(await visibleOpportunities("vend-a"), ["a"])
    assert.deepEqual(await visibleOpportunities("vend-sem"), ["sem"])
  })

  it("fora da equipe responde como inexistente, tambem ao alterar", async () => {
    const manager = await login("gestor-a")
    assert.equal((await manager.request(`/api/opportunities/${id("opp-a")}`)).status, 200)
    assert.equal((await manager.request(`/api/opportunities/${id("opp-b")}`)).status, 404)
    assert.equal((await manager.request(`/api/opportunities/${id("opp-sem")}`)).status, 404)
    assert.equal((await manager.json(`/api/opportunities/${id("opp-b")}`, "PATCH", { status: "WON" })).status, 404)
    assert.equal((await manager.json(`/api/activities/${id("act-b")}`, "PATCH", { completed: true })).status, 404)
    assert.equal((await manager.request(`/pipeline/${id("opp-b")}`)).status, 404)
  })

  it("busca, quadro e Meu Dia respeitam a equipe junto com o filtro de texto", async () => {
    const manager = await login("gestor-a")
    const search = JSON.stringify((await json(await manager.request(`/api/search?q=${PREFIX}negocio`))).body)
    assert.ok(search.includes(`${PREFIX}negocio a`))
    assert.ok(search.includes(`${PREFIX}negocio orfa`))
    assert.equal(search.includes(`${PREFIX}negocio b`), false)
    assert.equal(search.includes(`${PREFIX}negocio sem`), false)

    const board = await (await manager.request(`/pipeline?q=${PREFIX}negocio`)).text()
    assert.ok(board.includes(`${PREFIX}negocio a`))
    assert.equal(board.includes(`${PREFIX}negocio b`), false)
    // O filtro de dono so oferece a equipe.
    assert.ok(board.includes(id("vend-a")))
    assert.equal(board.includes(id("vend-b")), false)

    assert.equal((await manager.request("/api/meu-dia")).status, 200)
    assert.equal((await manager.request("/api/notifications")).status, 200)
  })

  it("gestor com equipe so atribui dentro da equipe", async () => {
    const manager = await login("gestor-a")
    const outside = await json(await manager.json(`/api/activities/${id("act-a")}`, "PATCH", { ownerId: id("vend-b") }))
    assert.equal(outside.status, 400)
    assert.equal((await manager.json(`/api/activities/${id("act-orfa")}`, "PATCH", { ownerId: id("vend-a") })).status, 200)
    const created = await manager.json("/api/activities", "POST", { type: "TASK", title: `${PREFIX}fora`, ownerId: id("vend-sem") })
    assert.equal(created.status, 400)

    // Gestor sem equipe atribui a qualquer pessoa da organizacao.
    const free = await login("gestor-livre")
    assert.equal((await free.json(`/api/activities/${id("act-sem")}`, "PATCH", { ownerId: id("vend-b") })).status, 200)
    await db.query(`update activities set "ownerId" = null where id = $1`, [id("act-orfa")])
    await db.query(`update activities set "ownerId" = $2 where id = $1`, [id("act-sem"), id("vend-sem")])
  })

  it("reunioes do SALEIA: as das negociacoes da equipe e as sem negociacao", async () => {
    const manager = await login("gestor-a")
    const listed = await json(await manager.request("/api/saleia/meetings"))
    assert.equal(listed.status, 200)
    assert.deepEqual(listed.body.meetings.map((meeting) => meeting.id.replace(id("reu-"), "")).sort(), ["a", "solta"])
    assert.equal((await manager.request(`/api/saleia/meetings/${id("reu-b")}`)).status, 404)
    assert.equal((await manager.request(`/api/saleia/meetings/${id("reu-a")}`)).status, 200)
    assert.equal((await manager.json(`/api/saleia/meetings/${id("reu-b")}/diagnosis`, "POST", { action: "contest" })).status, 404)

    const free = await json(await (await login("gestor-livre")).request("/api/saleia/meetings"))
    assert.equal(free.body.meetings.length, 3)
  })

  it("Dashboard: numeros da equipe e filtro so com pessoas dela", async () => {
    const manager = await login("gestor-a")
    const { status, body } = await json(await manager.request("/api/dashboard"))
    assert.equal(status, 200)
    // Em andamento: a, gestor e orfa (b e sem ficam de fora).
    assert.equal(body.dashboard.health.openCount, 3)
    assert.equal(body.dashboard.scope, "ORGANIZATION")
    assert.equal(body.dashboard.goals.rows.some((row) => row.userId === null), false)
    assert.equal(body.dashboard.funnel.leads, null)
    assert.equal((await manager.request(`/api/dashboard?vendedor=${id("vend-a")}`)).status, 200)
    assert.equal((await manager.request(`/api/dashboard?vendedor=${id("vend-b")}`)).status, 404)
    assert.equal((await manager.request("/dashboard")).status, 200)

    const admin = await json(await (await login("admin")).request("/api/dashboard"))
    assert.equal(admin.body.dashboard.health.openCount, 5)
  })

  it("Report: o gestor com equipe so abre o dia e os dias fechados da equipe", async () => {
    for (const name of ["vend-a", "vend-b"]) {
      assert.equal((await (await login(name)).json("/api/reports/daily", "POST", {})).status, 201, name)
    }
    const manager = await login("gestor-a")
    assert.equal((await manager.request(`/api/reports/daily?vendedor=${id("vend-a")}`)).status, 200)
    assert.equal((await manager.request(`/api/reports/daily?vendedor=${id("vend-b")}`)).status, 404)
    assert.equal((await manager.request(`/api/reports/daily/closed?vendedor=${id("vend-b")}`)).status, 404)
    const closed = await json(await manager.request("/api/reports/daily/closed"))
    assert.deepEqual(closed.body.reports.map((report) => report.userId), [id("vend-a")])
    assert.equal((await manager.request("/report?aba=fechados")).status, 200)

    const all = await json(await (await login("gestor-livre")).request("/api/reports/daily/closed"))
    assert.equal(all.body.reports.length, 2)
  })

  it("mudar a equipe vale na hora; remover a equipe devolve a visao completa", async () => {
    const admin = await login("admin")
    const manager = await login("gestor-a")
    assert.equal((await setTeam(admin, "vend-b", teamA)).status, 200)
    assert.equal((await manager.request(`/api/opportunities/${id("opp-b")}`)).status, 200)
    assert.equal((await setTeam(admin, "vend-b", null)).status, 200)
    assert.equal((await manager.request(`/api/opportunities/${id("opp-b")}`)).status, 404)

    const removed = await json(await admin.request(`/api/settings/teams/${teamA}`, { method: "DELETE" }))
    assert.equal(removed.status, 200)
    assert.equal(removed.body.members, 2)
    assert.deepEqual(await visibleOpportunities("gestor-a"), ["a", "b", "gestor", "orfa", "sem"])

    const audit = await db.query(
      `select action, count(*)::int as total from audit_logs where "organizationId" = $1 and (action like 'team.%' or action = 'member.team-changed') group by 1 order by 1`,
      [ORG]
    )
    assert.deepEqual(audit.rows, [
      { action: "member.team-changed", total: 5 },
      { action: "team.created", total: 2 },
      { action: "team.removed", total: 1 },
      { action: "team.renamed", total: 1 },
    ])
  })
})
