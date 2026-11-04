// Testa detalhe, edicao e filtros das negociacoes (Tarefa V2-4.2) por HTTP, contra
// o app e o banco de desenvolvimento. Cria apenas registros com o prefixo abaixo,
// removidos ao final. Recusa rodar fora de localhost (tests/support.mjs).
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import {
  Client,
  PASSWORD,
  createDb,
  ensurePipelines,
  legacyColumns,
  stageIdOf,
} from "./support.mjs"

const PREFIX = "kanban-test-"

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

const put = (client, name, body) => client.json(`/api/opportunities/${id(name)}`, "PUT", body)
const row = async (name) =>
  (await db.query(`select * from opportunities where id = $1`, [id(name)])).rows[0]

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

  for (const [name, organization] of [["empresa-a", ORG], ["empresa-b", ORG], ["empresa-alheia", ORG_B]]) {
    await db.query(
      `insert into companies (id, "organizationId", name, "updatedAt") values ($1, $2, $1, now())`,
      [id(name), organization]
    )
  }
  await db.query(
    `insert into contacts (id, "organizationId", "companyId", name, "updatedAt") values ($1, $2, $3, $1, now())`,
    [id("contato-a"), ORG, id("empresa-a")]
  )

  const day = 24 * 60 * 60 * 1000
  const now = Date.now()
  for (const [name, organization, owner, value, stage, daysAgo, close, company] of [
    ["v1-aberta", ORG, "vendedor1", 1000, "PROSPECTING", 1, "2027-01-20", "empresa-a"],
    ["v1-grande", ORG, "vendedor1", 9000, "PROPOSAL", 30, "2026-12-10", null],
    ["v2-aberta", ORG, "vendedor2", 3000, "PROPOSAL", 5, null, null],
    ["sem-dono", ORG, null, 500, "PROSPECTING", 2, null, null],
    ["v1-ganha", ORG, "vendedor1", 700, "CLOSED_WON", 3, null, null],
    ["alheia", ORG_B, "outro", 100, "PROSPECTING", 1, null, null],
  ]) {
    await db.query(
      `insert into opportunities (id, "organizationId", "ownerId", "companyId", title, value, "pipelineId", "stageId",
         status, "stageChangedAt", "expectedClose", "wonAt", "updatedAt")
       values ($1, $2, $3, $4, $1, $5, $6, $7, $8, $9, $10, $11, now())`,
      [id(name), organization, owner ? id(owner) : null, company ? id(company) : null, value,
        ...legacyColumns(organization, stage), new Date(now - daysAgo * day).toISOString(), close,
        stage === "CLOSED_WON" ? new Date(now).toISOString() : null]
    )
  }

  await db.query(
    `insert into opportunity_stage_history (id, "organizationId", "opportunityId", "toStageId", "toStatus", "changedById")
     values ($1, $2, $3, $4, 'OPEN', $5)`,
    [id("historico"), ORG, id("v1-aberta"), stageIdOf(ORG, "PROSPECTING"), id("vendedor1")]
  )
})

after(async () => {
  await cleanup()
  await db.end()
})

describe("detalhe", () => {
  it("devolve dados, etapa, funil, dono e historico", async () => {
    const response = await (await login("vendedor1")).request(`/api/opportunities/${id("v1-aberta")}`)
    assert.equal(response.status, 200)
    const { opportunity } = await response.json()
    assert.equal(opportunity.value, 1000)
    assert.equal(opportunity.stage.name, "Prospecção")
    assert.equal(opportunity.pipeline.name, "Vendas")
    assert.equal(opportunity.owner.id, id("vendedor1"))
    assert.equal(opportunity.company.id, id("empresa-a"))
    assert.deepEqual(
      opportunity.history.map((entry) => [entry.toStageName, entry.changedByName]),
      [["Prospecção", id("vendedor1")]]
    )
  })

  it("nao abre negociacao de colega nem de outra organizacao", async () => {
    const vendedor = await login("vendedor1")
    for (const name of ["v2-aberta", "sem-dono", "alheia"]) {
      assert.equal((await vendedor.request(`/api/opportunities/${id(name)}`)).status, 404, name)
      assert.equal((await vendedor.request(`/pipeline/${id(name)}`)).status, 404, name)
    }
  })

  it("pagina mostra a negociacao e as acoes do papel", async () => {
    const vendedor = await (await (await login("vendedor1")).request(`/pipeline/${id("v1-aberta")}`)).text()
    assert.match(vendedor, /Histórico/)
    assert.match(vendedor, /Ganhar/)
    assert.match(vendedor, /Editar/)

    const fechada = await (await (await login("vendedor1")).request(`/pipeline/${id("v1-ganha")}`)).text()
    assert.match(fechada, /Só gestor ou administrador pode reabrir/)
    assert.ok(!fechada.includes(">Editar<"))

    const gestor = await (await (await login("gestor")).request(`/pipeline/${id("v1-ganha")}`)).text()
    assert.match(gestor, /Reabrir/)
  })
})

describe("edicao", () => {
  it("altera dados, grava so o que mudou e audita sem valores", async () => {
    const vendedor = await login("vendedor1")
    const response = await put(vendedor, "v1-aberta", {
      title: "Contrato revisado",
      value: 1250.5,
      expectedClose: "2027-02-01",
      notes: "Pediu desconto",
    })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).opportunity.value, 1250.5)

    const saved = await row("v1-aberta")
    assert.equal(saved.title, "Contrato revisado")
    assert.equal(saved.value, "1250.50")

    const { rows } = await db.query(
      `select "actorUserId", metadata from audit_logs where "entityId" = $1 and action = 'opportunity.updated'`,
      [id("v1-aberta")]
    )
    assert.deepEqual(rows, [
      { actorUserId: id("vendedor1"), metadata: { fields: ["title", "value", "expectedClose", "notes"] } },
    ])
  })

  it("nao edita negociacao fora do escopo", async () => {
    const vendedor = await login("vendedor1")
    assert.equal((await put(vendedor, "v2-aberta", { value: 1 })).status, 404)
    assert.equal((await put(vendedor, "alheia", { value: 1 })).status, 404)
  })

  it("valida titulo, valor, empresa e contato", async () => {
    const vendedor = await login("vendedor1")
    assert.equal((await put(vendedor, "v1-grande", { title: "x" })).status, 400)
    assert.equal((await put(vendedor, "v1-grande", { value: -1 })).status, 400)
    assert.equal((await put(vendedor, "v1-grande", { companyId: id("empresa-alheia") })).status, 400)
    const conflito = await put(vendedor, "v1-grande", { companyId: id("empresa-b"), contactId: id("contato-a") })
    assert.equal(conflito.status, 400)
    assert.equal((await conflito.json()).error, "O contato pertence a outra empresa.")
  })

  it("herda a empresa do contato e limpa vinculos com nulo", async () => {
    const vendedor = await login("vendedor1")
    assert.equal((await put(vendedor, "v1-grande", { contactId: id("contato-a") })).status, 200)
    assert.equal((await row("v1-grande")).companyId, id("empresa-a"))

    assert.equal((await put(vendedor, "v1-grande", { contactId: "", companyId: "" })).status, 200)
    const saved = await row("v1-grande")
    assert.equal(saved.contactId, null)
    assert.equal(saved.companyId, null)
  })

  it("vendedor nao troca o dono; gestor troca, so por membro da organizacao", async () => {
    const vendedor = await login("vendedor1")
    assert.equal((await put(vendedor, "v1-grande", { ownerId: id("vendedor2") })).status, 403)

    const gestor = await login("gestor")
    assert.equal((await put(gestor, "sem-dono", { ownerId: id("outro") })).status, 400)
    assert.equal((await put(gestor, "sem-dono", { ownerId: id("vendedor2") })).status, 200)
    assert.equal((await row("sem-dono")).ownerId, id("vendedor2"))

    assert.equal((await put(gestor, "sem-dono", { ownerId: null })).status, 200)
    assert.equal((await row("sem-dono")).ownerId, null)
  })

  it("encerrada so e editada por gestor ou administrador", async () => {
    assert.equal((await put(await login("vendedor1"), "v1-ganha", { value: 1 })).status, 403)
    assert.equal((await put(await login("gestor"), "v1-ganha", { value: 800 })).status, 200)
  })
})

describe("mudar de funil", () => {
  it("leva a negociacao para uma etapa de outro funil", async () => {
    const gestor = await login("gestor")
    const created = await (
      await gestor.json("/api/pipelines", "POST", {
        name: "Parcerias",
        stages: [{ name: "Indicação", probability: 35 }],
      })
    ).json()
    const [stage] = created.pipeline.stages

    const moved = await gestor.json(`/api/opportunities/${id("v2-aberta")}`, "PATCH", { stageId: stage.id })
    assert.equal(moved.status, 200)
    const saved = await row("v2-aberta")
    assert.equal(saved.pipelineId, created.pipeline.id)
    assert.equal(saved.probability, 35)

    const back = await gestor.json(`/api/opportunities/${id("v2-aberta")}`, "PATCH", {
      stageId: stageIdOf(ORG, "PROPOSAL"),
    })
    assert.equal(back.status, 200)
  })
})

describe("filtros do quadro", () => {
  const titles = async (name, query) => {
    const response = await (await login(name)).request(`/pipeline?visao=lista&${query}`)
    assert.equal(response.status, 200)
    const page = await response.text()
    return [...page.matchAll(/href="\/pipeline\/([^"]+)"/g)].map((match) => match[1].replace(PREFIX, ""))
  }

  it("filtra por dono, sem dono e minhas", async () => {
    assert.deepEqual((await titles("gestor", `dono=${id("vendedor2")}`)), ["v2-aberta"])
    assert.deepEqual((await titles("gestor", "dono=sem-dono")), ["sem-dono"])
    assert.deepEqual((await titles("gestor", "dono=meus")), [])
  })

  it("vendedor ignora o filtro de dono e ve so as proprias", async () => {
    assert.deepEqual((await titles("vendedor1", `dono=${id("vendedor2")}&ordem=valor`)), ["v1-grande", "v1-aberta"])
  })

  it("ordena por valor, por fechamento e por tempo parado", async () => {
    assert.deepEqual((await titles("gestor", "ordem=valor")), ["v1-grande", "v2-aberta", "v1-aberta", "sem-dono"])
    assert.deepEqual((await titles("gestor", "ordem=fechamento")).slice(0, 2), ["v1-grande", "v1-aberta"])
    assert.equal((await titles("gestor", "ordem=parados"))[0], "v1-grande")
  })

  it("filtra por status e por texto em titulo, empresa ou contato", async () => {
    assert.deepEqual((await titles("gestor", "status=ganhas")), ["v1-ganha"])
    assert.deepEqual((await titles("gestor", "q=revisado")), ["v1-aberta"])
    assert.deepEqual((await titles("gestor", `q=${id("empresa-a")}`)), ["v1-aberta"])
    assert.deepEqual((await titles("gestor", "q=nada-com-isso")), [])
  })

  it("quadro traz os cartoes ligados ao detalhe", async () => {
    const page = await (await (await login("gestor")).request("/pipeline")).text()
    assert.ok(page.includes(`/pipeline/${id("v1-grande")}`))
    assert.match(page, /Toda a equipe/)

    const vendedor = await (await (await login("vendedor1")).request("/pipeline")).text()
    assert.ok(!vendedor.includes("Toda a equipe"))
  })
})
