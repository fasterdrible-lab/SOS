// Testa funis e etapas configuraveis e o status separado da etapa (Tarefa V2-4.1)
// por HTTP, contra o app e o banco de desenvolvimento. Cria apenas registros com o
// prefixo abaixo, removidos ao final. Recusa rodar fora de localhost.
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb, ensurePipelines, stageIdOf } from "./support.mjs"

const PREFIX = "pipe-test-"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORG = id("org")
const ORG_B = id("org-b")

async function cleanup() {
  const created = await db.query(
    `select o.id from organizations o join organization_members m on m."organizationId" = o.id
     join users u on u.id = m."userId" where u.email like $1`,
    [`${PREFIX}%`]
  )
  const organizations = [...new Set([ORG, ORG_B, ...created.rows.map((row) => row.id)])]
  await db.query(`delete from organizations where id = any($1)`, [organizations])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

const json = async (response) => ({ status: response.status, body: await response.json() })

/** Estado compartilhado entre os testes, que rodam em ordem. */
const state = {}

before(async () => {
  await db.connect()
  await cleanup()

  for (const organization of [ORG, ORG_B]) {
    await db.query(
      `insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`,
      [organization]
    )
  }
  await ensurePipelines(db, [ORG_B])

  const hash = await bcrypt.hash(PASSWORD, 4)
  for (const [name, organization, role] of [
    ["admin", ORG, "CONSULTANT"],
    ["gestor", ORG, "MANAGER"],
    ["vendedor", ORG, "MEMBER"],
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
})

after(async () => {
  await cleanup()
  await db.end()
})

describe("funil padrao", () => {
  it("organizacao sem funil recebe o padrao na primeira consulta", async () => {
    const { status, body } = await json(await (await login("vendedor")).request("/api/pipelines"))
    assert.equal(status, 200)
    assert.equal(body.pipelines.length, 1)
    const [vendas] = body.pipelines
    assert.equal(vendas.name, "Vendas")
    assert.equal(vendas.isDefault, true)
    assert.deepEqual(
      vendas.stages.map((stage) => [stage.name, stage.probability, stage.isProposal]),
      [
        ["Prospecção", 10, false],
        ["Qualificação", 25, false],
        ["Proposta", 50, true],
        ["Negociação", 75, false],
      ]
    )
    state.vendas = vendas
  })

  it("cliente novo ja nasce com o funil padrao", async () => {
    const admin = await login("admin")
    const created = await json(await admin.json("/api/organizations", "POST", { name: `${PREFIX}novo-cliente` }))
    assert.equal(created.status, 201)
    const { rows } = await db.query(
      `select p.name, count(s.*)::int as stages from pipelines p join pipeline_stages s on s."pipelineId" = p.id
       where p."organizationId" = $1 group by p.name`,
      [created.body.id]
    )
    assert.deepEqual(rows, [{ name: "Vendas", stages: 4 }])
  })
})

describe("criar funil", () => {
  const inside = {
    name: "Inside sales",
    stages: [
      { name: "Primeiro contato", probability: 15, isProposal: false },
      { name: "Demonstração", probability: 40, isProposal: true },
      { name: "Fechamento", probability: 80, isProposal: false },
    ],
  }

  it("vendedor nao cria funil", async () => {
    const response = await (await login("vendedor")).json("/api/pipelines", "POST", inside)
    assert.equal(response.status, 403)
  })

  it("recusa funil sem etapas ou com nomes repetidos", async () => {
    const gestor = await login("gestor")
    assert.equal((await gestor.json("/api/pipelines", "POST", { name: "Vazio", stages: [] })).status, 400)
    const duplicated = await gestor.json("/api/pipelines", "POST", {
      name: "Repetido",
      stages: [
        { name: "Etapa", probability: 10 },
        { name: "etapa", probability: 20 },
      ],
    })
    assert.equal(duplicated.status, 422)
  })

  it("gestor cria funil com etapas na ordem enviada, com auditoria", async () => {
    const { status, body } = await json(await (await login("gestor")).json("/api/pipelines", "POST", inside))
    assert.equal(status, 201)
    assert.equal(body.pipeline.isDefault, false)
    assert.deepEqual(
      body.pipeline.stages.map((stage) => [stage.name, stage.position, stage.probability]),
      [["Primeiro contato", 1, 15], ["Demonstração", 2, 40], ["Fechamento", 3, 80]]
    )
    state.inside = body.pipeline

    const { rows } = await db.query(
      `select action from audit_logs where "organizationId" = $1 and "entityId" = $2`,
      [ORG, body.pipeline.id]
    )
    assert.deepEqual(rows.map((row) => row.action), ["pipeline.created"])
  })
})

describe("negociacao no funil", () => {
  it("nasce na etapa escolhida, com a probabilidade dela", async () => {
    const vendedor = await login("vendedor")
    const { status, body } = await json(
      await vendedor.json("/api/opportunities", "POST", {
        title: `${PREFIX}inside`,
        value: 1000,
        stageId: state.inside.stages[0].id,
      })
    )
    assert.equal(status, 201)
    assert.equal(body.opportunity.pipelineId, state.inside.id)
    assert.equal(body.opportunity.stageId, state.inside.stages[0].id)
    assert.equal(body.opportunity.status, "OPEN")
    assert.equal(body.opportunity.probability, 15)
    state.opportunityId = body.opportunity.id
  })

  it("recusa etapa de outra organizacao", async () => {
    const vendedor = await login("vendedor")
    const create = await vendedor.json("/api/opportunities", "POST", {
      title: "Etapa alheia",
      value: 10,
      stageId: stageIdOf(ORG_B, "PROSPECTING"),
    })
    assert.equal(create.status, 400)

    const move = await vendedor.json(`/api/opportunities/${state.opportunityId}`, "PATCH", {
      stageId: stageIdOf(ORG_B, "PROPOSAL"),
    })
    assert.equal(move.status, 400)
  })

  it("muda de etapa e aparece nas propostas do Meu Dia pela marca da etapa", async () => {
    const vendedor = await login("vendedor")
    const moved = await json(
      await vendedor.json(`/api/opportunities/${state.opportunityId}`, "PATCH", {
        stageId: state.inside.stages[1].id,
      })
    )
    assert.equal(moved.status, 200)
    assert.equal(moved.body.opportunity.probability, 40)

    const summary = (await json(await vendedor.request("/api/meu-dia"))).body.summary
    assert.deepEqual(summary.proposals.items.map((item) => item.id), [state.opportunityId])
    assert.equal(summary.proposals.items[0].stageName, "Demonstração")
  })

  it("quadro mostra as etapas do funil escolhido", async () => {
    const page = await (await (await login("vendedor")).request(`/pipeline?funil=${state.inside.id}`)).text()
    for (const stage of state.inside.stages) assert.match(page, new RegExp(stage.name))
    assert.ok(page.includes(`${PREFIX}inside`))

    const padrao = await (await (await login("vendedor")).request("/pipeline")).text()
    assert.match(padrao, /Prospecção/)
    assert.ok(!padrao.includes(`${PREFIX}inside`))
  })
})

describe("editar etapas", () => {
  it("nao remove etapa com negociacao em andamento", async () => {
    const gestor = await login("gestor")
    const [first, , last] = state.inside.stages
    const response = await gestor.json(`/api/pipelines/${state.inside.id}`, "PUT", {
      name: "Inside sales",
      stages: [first, last].map(({ id: stageId, name, probability, isProposal }) => ({
        id: stageId,
        name,
        probability,
        isProposal,
      })),
    })
    assert.equal(response.status, 409)
  })

  it("renomeia, reordena, cria etapa e atualiza a probabilidade das abertas", async () => {
    const gestor = await login("gestor")
    const [first, demo, last] = state.inside.stages
    const { status, body } = await json(
      await gestor.json(`/api/pipelines/${state.inside.id}`, "PUT", {
        name: "Inside",
        stages: [
          { id: first.id, name: first.name, probability: 15, isProposal: false },
          { name: "Diagnóstico", probability: 30, isProposal: false },
          { id: demo.id, name: "Apresentação", probability: 45, isProposal: true },
          { id: last.id, name: last.name, probability: 80, isProposal: false },
        ],
      })
    )
    assert.equal(status, 200)
    assert.equal(body.pipeline.name, "Inside")
    assert.deepEqual(
      body.pipeline.stages.map((stage) => [stage.name, stage.position]),
      [["Primeiro contato", 1], ["Diagnóstico", 2], ["Apresentação", 3], ["Fechamento", 4]]
    )
    state.inside = body.pipeline

    const { rows } = await db.query(`select probability from opportunities where id = $1`, [state.opportunityId])
    assert.equal(rows[0].probability, 45)
  })

  it("encerrada fica na etapa removida e aparece em 'Etapas removidas'", async () => {
    const gestor = await login("gestor")
    const won = await json(
      await gestor.json(`/api/opportunities/${state.opportunityId}`, "PATCH", { status: "WON" })
    )
    assert.equal(won.body.opportunity.status, "WON")
    assert.equal(won.body.opportunity.stageId, state.inside.stages[2].id)

    const kept = state.inside.stages.filter((stage) => stage.name !== "Apresentação")
    const edited = await gestor.json(`/api/pipelines/${state.inside.id}`, "PUT", {
      name: "Inside",
      stages: kept.map(({ id: stageId, name, probability, isProposal }) => ({ id: stageId, name, probability, isProposal })),
    })
    assert.equal(edited.status, 200)

    const page = await (await gestor.request(`/pipeline?funil=${state.inside.id}&status=ganhas`)).text()
    assert.match(page, /Etapas removidas/)
    assert.ok(page.includes(`${PREFIX}inside`))
  })

  it("nao move para etapa removida nem muda etapa de encerrada", async () => {
    const gestor = await login("gestor")
    const archived = await db.query(
      `select id from pipeline_stages where "pipelineId" = $1 and "archivedAt" is not null`,
      [state.inside.id]
    )
    const closedMove = await gestor.json(`/api/opportunities/${state.opportunityId}`, "PATCH", {
      stageId: state.inside.stages[0].id,
    })
    assert.equal(closedMove.status, 422)

    // Ficou ganha na etapa removida: reabrir ali e recusado.
    const reopened = await json(
      await gestor.json(`/api/opportunities/${state.opportunityId}`, "PATCH", {
        status: "OPEN",
        stageId: archived.rows[0].id,
      })
    )
    assert.equal(reopened.status, 422)
    const sameStage = await gestor.json(`/api/opportunities/${state.opportunityId}`, "PATCH", { status: "OPEN" })
    assert.equal(sameStage.status, 422)
  })
})

describe("dashboard por funil", () => {
  it("filtra pelo funil e monta o funil com as etapas dele", async () => {
    const gestor = await login("gestor")
    const { body } = await json(await gestor.request(`/api/dashboard?funil=${state.inside.id}`))
    assert.equal(body.dashboard.pipelineId, state.inside.id)
    assert.equal(body.dashboard.funnel.pipelineName, "Inside")
    assert.equal(body.dashboard.revenue.value, 1000)
    assert.deepEqual(
      body.dashboard.funnel.steps.map((step) => step.name),
      ["Primeiro contato", "Diagnóstico", "Fechamento", "Ganha"]
    )

    const padrao = (await json(await gestor.request("/api/dashboard"))).body.dashboard
    assert.equal(padrao.funnel.pipelineName, "Vendas")
    assert.equal(padrao.pipelineId, null)

    const alheio = await gestor.request(`/api/dashboard?funil=pipe_${ORG_B}`)
    assert.equal(alheio.status, 404)
  })
})

describe("remover funil", () => {
  it("o padrao nao sai; outro so sem negociacoes em andamento", async () => {
    const gestor = await login("gestor")
    assert.equal((await gestor.request(`/api/pipelines/${state.vendas.id}`, { method: "DELETE" })).status, 409)

    const created = await json(
      await gestor.json("/api/opportunities", "POST", {
        title: "Aberta no inside",
        value: 1,
        stageId: state.inside.stages[0].id,
      })
    )
    assert.equal((await gestor.request(`/api/pipelines/${state.inside.id}`, { method: "DELETE" })).status, 409)

    await gestor.json(`/api/opportunities/${created.body.opportunity.id}`, "PATCH", {
      status: "LOST",
      lostReason: "Teste de remocao",
    })
    assert.equal((await gestor.request(`/api/pipelines/${state.inside.id}`, { method: "DELETE" })).status, 200)

    const { body } = await json(await gestor.request("/api/pipelines"))
    assert.deepEqual(body.pipelines.map((pipeline) => pipeline.name), ["Vendas"])

    const { rows } = await db.query(
      `select action from audit_logs where "entityId" = $1 order by "createdAt"`,
      [state.inside.id]
    )
    assert.deepEqual(rows.map((row) => row.action), [
      "pipeline.created",
      "pipeline.updated",
      "pipeline.updated",
      "pipeline.archived",
    ])
  })

  it("vendedor nao edita nem remove funil", async () => {
    const vendedor = await login("vendedor")
    assert.equal(
      (await vendedor.json(`/api/pipelines/${state.vendas.id}`, "PUT", { name: "X", stages: [{ name: "Y", probability: 1 }] })).status,
      403
    )
    assert.equal((await vendedor.request(`/api/pipelines/${state.vendas.id}`, { method: "DELETE" })).status, 403)
  })
})
