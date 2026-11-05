// Testa atividades, agenda e seus reflexos (Tarefa V2-6) por HTTP, contra o app e
// o banco de desenvolvimento. Cria apenas registros com o prefixo abaixo, removidos
// ao final. Recusa rodar fora de localhost (tests/support.mjs).
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb, ensurePipelines, legacyColumns } from "./support.mjs"

const PREFIX = "activity-test-"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORG = id("org")
const ORG_B = id("org-b")

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const iso = (offset) => new Date(Date.now() + offset).toISOString()
let noonToday

async function cleanup() {
  await db.query(`delete from activities where "organizationId" = any($1)`, [[ORG, ORG_B]])
  await db.query(`delete from organizations where id = any($1)`, [[ORG, ORG_B]])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

const create = (client, body) => client.json("/api/activities", "POST", body)
const activity = async (client, body) => {
  const response = await create(client, body)
  assert.equal(response.status, 201)
  return (await response.json()).activity
}
const listIds = async (name, query = "") => {
  const response = await (await login(name)).request(`/api/activities${query}`)
  assert.equal(response.status, 200)
  return (await response.json()).activities.map((item) => item.title)
}

before(async () => {
  await db.connect()
  await cleanup()

  const { rows } = await db.query(
    `select (date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '12 hours') at time zone 'America/Sao_Paulo' as noon`
  )
  noonToday = rows[0].noon.toISOString()

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

  for (const [name, organization] of [["acme", ORG], ["beta", ORG], ["alheia", ORG_B]]) {
    await db.query(
      `insert into companies (id, "organizationId", name, "updatedAt") values ($1, $2, $1, now())`,
      [id(name), organization]
    )
  }
  await db.query(
    `insert into contacts (id, "organizationId", "companyId", name, "updatedAt") values ($1, $2, $3, 'Ana', now())`,
    [id("ana"), ORG, id("acme")]
  )

  for (const [name, owner, company, contact] of [
    ["v1-negocio", "vendedor1", "acme", "ana"],
    ["v2-negocio", "vendedor2", "beta", null],
  ]) {
    await db.query(
      `insert into opportunities (id, "organizationId", "ownerId", "companyId", "contactId", title, value,
         "pipelineId", "stageId", status, "updatedAt")
       values ($1, $2, $3, $4, $5, $1, 1000, $6, $7, $8, now())`,
      [id(name), ORG, id(owner), id(company), contact ? id(contact) : null, ...legacyColumns(ORG, "PROPOSAL")]
    )
  }
})

after(async () => {
  await cleanup()
  await db.end()
})

describe("criar atividade", () => {
  it("nasce com o criador como responsavel", async () => {
    const created = await activity(await login("vendedor1"), { type: "TASK", title: "Sem data" })
    assert.equal(created.ownerId, id("vendedor1"))
    assert.equal(created.dueDate, null)
    assert.equal(created.completedAt, null)
  })

  it("reuniao e follow-up exigem data", async () => {
    const vendedor = await login("vendedor1")
    assert.equal((await create(vendedor, { type: "MEETING", title: "Reuniao sem data" })).status, 422)
    assert.equal((await create(vendedor, { type: "FOLLOW_UP", title: "FUP sem data" })).status, 422)
  })

  it("nota nasce concluida", async () => {
    const note = await activity(await login("vendedor1"), { type: "NOTE", title: "Registro da conversa" })
    assert.ok(note.completedAt)
  })

  it("valida titulo, tipo e data", async () => {
    const vendedor = await login("vendedor1")
    assert.equal((await create(vendedor, { type: "TASK", title: "x" })).status, 400)
    assert.equal((await create(vendedor, { type: "VISITA", title: "Tipo errado" })).status, 400)
    assert.equal((await create(vendedor, { type: "TASK", title: "Data errada", dueDate: "ontem" })).status, 400)
  })

  it("herda empresa e contato da negociacao", async () => {
    const created = await activity(await login("vendedor1"), {
      type: "CALL",
      title: "Ligar",
      opportunityId: id("v1-negocio"),
    })
    assert.equal(created.companyId, id("acme"))
    assert.equal(created.contactId, id("ana"))
  })

  it("recusa vinculos de empresas diferentes", async () => {
    const response = await create(await login("gestor"), {
      type: "TASK",
      title: "Empresas diferentes",
      opportunityId: id("v1-negocio"),
      companyId: id("beta"),
    })
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error, "A atividade liga empresas diferentes.")
  })

  it("nao liga a negociacao de colega nem a dados de outra organizacao", async () => {
    const vendedor = await login("vendedor1")
    assert.equal((await create(vendedor, { type: "TASK", title: "De colega", opportunityId: id("v2-negocio") })).status, 400)
    assert.equal((await create(vendedor, { type: "TASK", title: "Alheia", companyId: id("alheia") })).status, 400)
  })

  it("vendedor nao atribui a outra pessoa; gestor atribui so a membro", async () => {
    const vendedor = await login("vendedor1")
    assert.equal((await create(vendedor, { type: "TASK", title: "Para colega", ownerId: id("vendedor2") })).status, 403)
    assert.equal((await create(vendedor, { type: "TASK", title: "Sem dono", ownerId: "" })).status, 403)

    const gestor = await login("gestor")
    assert.equal((await create(gestor, { type: "TASK", title: "Alheio", ownerId: id("outro") })).status, 400)
    const assigned = await activity(gestor, { type: "TASK", title: "Para o vendedor 2", ownerId: id("vendedor2") })
    assert.equal(assigned.ownerId, id("vendedor2"))
  })
})

describe("visibilidade", () => {
  it("vendedor ve so as proprias; gestor ve a equipe e filtra", async () => {
    const vendedor2 = await listIds("vendedor2")
    assert.deepEqual(vendedor2, ["Para o vendedor 2"])

    const gestor = await listIds("gestor")
    assert.ok(gestor.includes("Sem data") && gestor.includes("Para o vendedor 2"))
    assert.deepEqual(await listIds("gestor", `?dono=${id("vendedor2")}`), ["Para o vendedor 2"])
    assert.ok(!(await listIds("vendedor1", `?dono=${id("vendedor2")}`)).includes("Para o vendedor 2"))
  })

  it("filtra por tipo e por concluidas", async () => {
    assert.deepEqual(await listIds("vendedor1", "?tipo=CALL"), ["Ligar"])
    assert.deepEqual(await listIds("vendedor1", "?status=concluidas"), ["Registro da conversa"])
  })

  it("nao alcanca atividade de colega nem de outra organizacao", async () => {
    const alheia = await activity(await login("gestor"), { type: "TASK", title: "Da equipe", ownerId: id("vendedor2") })
    for (const name of ["vendedor1", "outro"]) {
      const client = await login(name)
      assert.equal((await client.json(`/api/activities/${alheia.id}`, "PATCH", { completed: true })).status, 404, name)
      assert.equal((await client.request(`/api/activities/${alheia.id}`, { method: "DELETE" })).status, 404, name)
    }
  })

  it("exige sessao", async () => {
    assert.ok([401, 302, 307].includes((await new Client().request("/api/activities")).status))
  })
})

describe("editar, concluir e remover", () => {
  it("conclui preservando a data e reabre", async () => {
    const vendedor = await login("vendedor1")
    const item = await activity(vendedor, { type: "EMAIL", title: "Enviar proposta" })
    const done = await (await vendedor.json(`/api/activities/${item.id}`, "PATCH", { completed: true })).json()
    assert.ok(done.activity.completedAt)

    const again = await (await vendedor.json(`/api/activities/${item.id}`, "PATCH", { completed: true })).json()
    assert.equal(again.activity.completedAt, done.activity.completedAt)

    const reopened = await (await vendedor.json(`/api/activities/${item.id}`, "PATCH", { completed: false })).json()
    assert.equal(reopened.activity.completedAt, null)
  })

  it("edita sem apagar a data de reuniao", async () => {
    const vendedor = await login("vendedor1")
    const item = await activity(vendedor, { type: "MEETING", title: "Reuniao", dueDate: iso(2 * DAY) })
    assert.equal((await vendedor.json(`/api/activities/${item.id}`, "PATCH", { title: "Reuniao revista" })).status, 200)
    assert.equal((await vendedor.json(`/api/activities/${item.id}`, "PATCH", { dueDate: null })).status, 422)
    const task = await activity(vendedor, { type: "TASK", title: "Tarefa" })
    assert.equal((await vendedor.json(`/api/activities/${task.id}`, "PATCH", { type: "MEETING" })).status, 422)
  })

  it("vendedor nao troca o responsavel; gestor troca", async () => {
    const vendedor = await login("vendedor1")
    const item = await activity(vendedor, { type: "TASK", title: "Passar adiante" })
    assert.equal((await vendedor.json(`/api/activities/${item.id}`, "PATCH", { ownerId: id("vendedor2") })).status, 403)
    assert.equal((await (await login("gestor")).json(`/api/activities/${item.id}`, "PATCH", { ownerId: id("vendedor2") })).status, 200)
  })

  it("revalida vinculos ao editar", async () => {
    const vendedor = await login("vendedor1")
    const item = await activity(vendedor, { type: "TASK", title: "Vinculo", opportunityId: id("v1-negocio") })
    const response = await vendedor.json(`/api/activities/${item.id}`, "PATCH", { companyId: id("beta") })
    assert.equal(response.status, 400)
  })

  it("remove", async () => {
    const vendedor = await login("vendedor1")
    const item = await activity(vendedor, { type: "TASK", title: "Remover" })
    assert.equal((await vendedor.request(`/api/activities/${item.id}`, { method: "DELETE" })).status, 200)
    assert.equal((await vendedor.request(`/api/activities/${item.id}`, { method: "DELETE" })).status, 404)
  })
})

describe("Meu Dia e notificacoes", () => {
  before(async () => {
    const vendedor = await login("vendedor2")
    await activity(vendedor, { type: "MEETING", title: "Reuniao de hoje", dueDate: noonToday })
    await activity(vendedor, { type: "FOLLOW_UP", title: "FUP de hoje", dueDate: noonToday })
    await activity(vendedor, { type: "CALL", title: "Ligacao atrasada", dueDate: iso(-3 * DAY), companyId: id("beta") })
    await activity(vendedor, { type: "MEETING", title: "Reuniao da semana que vem", dueDate: iso(8 * DAY) })
  })

  it("Meu Dia traz reunioes de hoje e follow-ups vencidos e de hoje", async () => {
    const { summary } = await (await (await login("vendedor2")).request("/api/meu-dia")).json()
    assert.deepEqual(summary.meetingsToday.items.map((item) => item.title), ["Reuniao de hoje"])
    assert.equal(summary.followUps.overdue, 1)
    assert.ok(summary.followUps.today >= 1)
    const [first] = summary.followUps.items
    assert.equal(first.title, "Ligacao atrasada")
    assert.equal(first.overdue, true)
    assert.equal(first.companyName, id("beta"))
  })

  it("vendedor nao ve as do colega; gestor ve a equipe", async () => {
    const vendedor1 = (await (await (await login("vendedor1")).request("/api/meu-dia")).json()).summary
    assert.equal(vendedor1.meetingsToday.total, 0)
    const gestor = (await (await (await login("gestor")).request("/api/meu-dia")).json()).summary
    assert.equal(gestor.meetingsToday.total, 1)
  })

  it("pagina mostra as listas, sem o aviso de em breve", async () => {
    const page = await (await (await login("vendedor2")).request("/meu-dia")).text()
    assert.match(page, /Reuniao de hoje/)
    assert.ok(!page.includes("quando o módulo Atividades"))
  })

  it("sino avisa as atividades atrasadas, no escopo do papel", async () => {
    const notifications = async (name) =>
      (await (await (await login(name)).request("/api/notifications")).json()).notifications
    const vendedor2 = await notifications("vendedor2")
    const item = vendedor2.items.find((entry) => entry.kind === "overdue-activities")
    assert.equal(item.count, 1)
    assert.equal(item.href, "/atividades")
    const vendedor1 = await notifications("vendedor1")
    assert.ok(!vendedor1.items.some((entry) => entry.kind === "overdue-activities"))
  })
})

describe("telas", () => {
  const html = async (name, path) => {
    const response = await (await login(name)).request(path)
    assert.equal(response.status, 200, path)
    return response.text()
  }

  it("lista agrupa e o menu leva a tela", async () => {
    const page = await html("vendedor2", "/atividades")
    // O React separa o numero com comentarios no HTML.
    assert.match(page, /Atrasadas(<!-- -->)? \((<!-- -->)?1/)
    assert.match(page, /Ligacao atrasada/)
    assert.ok(page.includes('href="/atividades"'))
    assert.ok(!page.includes("Toda a equipe"))
    assert.match(await html("gestor", "/atividades"), /Toda a equipe/)
  })

  it("agenda mostra a semana e navega", async () => {
    const page = await html("vendedor2", "/atividades?visao=agenda")
    assert.match(page, /Reuniao de hoje/)
    assert.ok(!page.includes("Reuniao da semana que vem"))

    // Daqui a 8 dias cai sempre na proxima semana ou na seguinte.
    const seguinte = await html("vendedor2", "/atividades?visao=agenda&semana=1")
    const depois = await html("vendedor2", "/atividades?visao=agenda&semana=2")
    assert.ok(seguinte.includes("Reuniao da semana que vem") !== depois.includes("Reuniao da semana que vem"))
    assert.match(seguinte, /Esta semana/)
    assert.ok(!seguinte.includes("Reuniao de hoje"))
  })

  it("negociacao e empresa mostram as atividades", async () => {
    assert.match(await html("vendedor1", `/pipeline/${id("v1-negocio")}`), /Ligar/)
    assert.match(await html("vendedor1", `/empresas/${id("acme")}`), /Ligar/)
    const { company } = await (await (await login("vendedor2")).request(`/api/companies/${id("acme")}`)).json()
    assert.deepEqual(company.activities, [])
  })
})
