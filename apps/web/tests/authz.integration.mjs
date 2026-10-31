// Testa autorizacao e isolamento por HTTP, contra o app e o banco de desenvolvimento.
// Requer o app rodando (BASE_URL) e cria apenas registros com o prefixo abaixo,
// removidos ao final. Recusa rodar fora de localhost.
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"
import pg from "pg"

process.loadEnvFile(".env")

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100"
const PREFIX = "authz-test-"
const PASSWORD = "senha-de-teste-authz-123"
const FAKE_API_KEY = "sk-ant-chave-falsa-de-teste-0123456789"

const databaseHost = new URL(process.env.DATABASE_URL).hostname
assert.ok(
  ["localhost", "127.0.0.1"].includes(databaseHost) &&
    ["localhost", "127.0.0.1"].includes(new URL(BASE_URL).hostname),
  "Estes testes so rodam em ambiente local."
)

const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`

class Client {
  cookies = new Map()

  store(response) {
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";")
      const index = pair.indexOf("=")
      this.cookies.set(pair.slice(0, index), pair.slice(index + 1))
    }
  }

  async request(path, init = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      redirect: "manual",
      ...init,
      headers: {
        ...init.headers,
        cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "),
      },
    })
    this.store(response)
    return response
  }

  json(path, method, body) {
    return this.request(path, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  async login(name) {
    const csrf = await (await this.request("/api/auth/csrf")).json()
    await this.request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken,
        email: email(name),
        password: PASSWORD,
        callbackUrl: BASE_URL,
      }),
    })
    const session = await this.session()
    assert.equal(session?.user?.email, email(name), `login de ${name} falhou`)
    return this
  }

  async session() {
    return (await this.request("/api/auth/session")).json()
  }
}

async function cleanup() {
  const like = `${PREFIX}%`
  const created = await db.query(
    `select o.id from organizations o join organization_members m on m."organizationId" = o.id
     join users u on u.id = m."userId" where u.email like $1`,
    [like]
  )
  const organizationIds = [
    ...new Set([...created.rows.map((row) => row.id), id("org-a"), id("org-b")]),
  ]
  for (const table of ["opportunities", "companies"]) {
    await db.query(`delete from ${table} where "organizationId" = any($1)`, [organizationIds])
  }
  await db.query(`delete from organizations where id = any($1)`, [organizationIds])
  await db.query(`delete from users where email like $1`, [like])
}

const USERS = {
  admin: ["org-a", "CONSULTANT"],
  gestor: ["org-a", "MANAGER"],
  vendedor1: ["org-a", "MEMBER"],
  vendedor2: ["org-a", "MEMBER"],
  promovido: ["org-a", "MEMBER"],
  removido: ["org-a", "MEMBER"],
  excluido: ["org-a", "MEMBER"],
  outro: ["org-b", "CONSULTANT"],
  novo: [null, null],
}

before(async () => {
  await db.connect()
  await cleanup()

  const hash = await bcrypt.hash(PASSWORD, 4)

  for (const organization of ["org-a", "org-b"]) {
    await db.query(
      `insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`,
      [id(organization)]
    )
  }

  for (const [name, [organization, role]] of Object.entries(USERS)) {
    await db.query(
      `insert into users (id, name, email, "passwordHash", "updatedAt") values ($1, $1, $2, $3, now())`,
      [id(name), email(name), hash]
    )
    if (organization) {
      await db.query(
        `insert into organization_members (id, "organizationId", "userId", role)
         values ($1, $2, $1, $3)`,
        [id(name), id(organization), role]
      )
    }
  }

  const opportunities = [
    ["opp-v1", "org-a", "vendedor1"],
    ["opp-v2", "org-a", "vendedor2"],
    ["opp-livre", "org-a", null, 7777000],
    ["opp-b", "org-b", "outro"],
  ]
  for (const [name, organization, owner, value = 1000] of opportunities) {
    await db.query(
      `insert into opportunities (id, "organizationId", "ownerId", title, value, "updatedAt")
       values ($1, $2, $3, $1, $4, now())`,
      [id(name), id(organization), owner ? id(owner) : null, value]
    )
  }

  await db.query(
    `insert into companies (id, "organizationId", name, "updatedAt") values ($1, $2, $1, now())`,
    [id("empresa-b"), id("org-b")]
  )
  await db.query(
    `insert into action_plans (id, "organizationId", title, objective, "updatedAt")
     values ($1, $2, $1, 'teste', now())`,
    [id("plano-b"), id("org-b")]
  )
})

after(async () => {
  await cleanup()
  await db.end()
})

const listIds = async (client) => {
  const response = await client.request("/api/opportunities")
  assert.equal(response.status, 200)
  const { opportunities } = await response.json()
  return opportunities.map((opportunity) => opportunity.id).sort()
}

describe("sem sessao", () => {
  const privateRoutes = [
    "/api/opportunities",
    "/api/companies",
    "/api/contacts",
    "/api/action-plans",
    "/api/settings/integrations",
    "/api/consultor/messages",
    "/dashboard",
    "/configuracoes",
  ]

  it("nao entrega dados privados", async () => {
    for (const route of privateRoutes) {
      const response = await new Client().request(route)
      assert.ok(
        [302, 303, 307, 401].includes(response.status),
        `${route} respondeu ${response.status}`
      )
    }
  })

  it("rejeita cookie de sessao forjado", async () => {
    const client = new Client()
    client.cookies.set("authjs.session-token", "token.forjado.invalido")
    const response = await client.request("/api/opportunities")
    assert.notEqual(response.status, 200)
    const session = await new Client().session()
    assert.equal(session?.user, undefined)
  })
})

describe("isolamento entre organizacoes", () => {
  it("nao lista nem altera dados de outra organizacao", async () => {
    const admin = await new Client().login("admin")
    assert.ok(!(await listIds(admin)).includes(id("opp-b")))

    const patch = await admin.json(`/api/opportunities/${id("opp-b")}`, "PATCH", {
      stage: "CLOSED_WON",
    })
    assert.equal(patch.status, 404)

    const { rows } = await db.query(`select stage from opportunities where id = $1`, [id("opp-b")])
    assert.equal(rows[0].stage, "PROSPECTING")
  })

  it("nao troca para organizacao alheia", async () => {
    const admin = await new Client().login("admin")
    const response = await admin.json("/api/session/organization", "POST", {
      organizationId: id("org-b"),
    })
    assert.equal(response.status, 404)
    assert.equal((await admin.session()).user.organizationId, id("org-a"))
  })

  it("nao aceita identificadores de outra organizacao", async () => {
    const admin = await new Client().login("admin")
    const opportunity = await admin.json("/api/opportunities", "POST", {
      title: "Com empresa alheia",
      value: 10,
      companyId: id("empresa-b"),
    })
    assert.equal(opportunity.status, 400)

    const tasks = await admin.request(`/api/action-plans/${id("plano-b")}/tasks`)
    assert.equal(tasks.status, 404)
  })
})

describe("vendedor", () => {
  it("ve apenas as proprias oportunidades", async () => {
    const vendedor = await new Client().login("vendedor1")
    assert.deepEqual(await listIds(vendedor), [id("opp-v1")])
  })

  it("nao altera oportunidade de colega nem sem dono", async () => {
    const vendedor = await new Client().login("vendedor1")
    for (const name of ["opp-v2", "opp-livre"]) {
      const response = await vendedor.json(`/api/opportunities/${id(name)}`, "PATCH", {
        stage: "PROPOSAL",
      })
      assert.equal(response.status, 404)
    }
  })

  it("altera a propria e cria oportunidade sendo o dono", async () => {
    const vendedor = await new Client().login("vendedor1")
    const patch = await vendedor.json(`/api/opportunities/${id("opp-v1")}`, "PATCH", {
      stage: "QUALIFICATION",
    })
    assert.equal(patch.status, 200)

    const created = await vendedor.json("/api/opportunities", "POST", {
      title: "Criada pelo vendedor",
      value: 500,
    })
    assert.equal(created.status, 201)
    const { opportunity } = await created.json()
    assert.equal(opportunity.ownerId, id("vendedor1"))
  })

  it("nao escolhe outro dono pelo payload", async () => {
    const vendedor = await new Client().login("vendedor1")
    const created = await vendedor.json("/api/opportunities", "POST", {
      title: "Tentativa de dono falso",
      value: 1,
      ownerId: id("vendedor2"),
      role: "ADMIN",
      organizationId: id("org-b"),
    })
    assert.equal(created.status, 201)
    const { opportunity } = await created.json()
    assert.equal(opportunity.ownerId, id("vendedor1"))
    assert.equal(opportunity.organizationId, id("org-a"))
  })

  it("recebe 403 nas acoes restritas", async () => {
    const vendedor = await new Client().login("vendedor1")
    const attempts = [
      vendedor.request("/api/settings/integrations"),
      vendedor.json("/api/settings/integrations", "POST", {
        provider: "ANTHROPIC",
        apiKey: FAKE_API_KEY,
      }),
      vendedor.request("/api/settings/integrations/ANTHROPIC", { method: "DELETE" }),
      vendedor.json("/api/action-plans", "POST", { title: "Plano", objective: "Objetivo" }),
      vendedor.request("/api/consultor/messages"),
      vendedor.json("/api/organizations", "POST", { name: "Tentativa" }),
    ]
    for (const response of await Promise.all(attempts)) {
      assert.equal(response.status, 403, response.url)
    }
  })

  it("nao ve as paginas restritas", async () => {
    const vendedor = await new Client().login("vendedor1")
    for (const route of ["/configuracoes", "/consultor", "/sdr"]) {
      const response = await vendedor.request(route)
      assert.ok((await response.text()).includes("Acesso restrito"), route)
    }
  })

  it("ve no pipeline e no dashboard apenas os proprios valores", async () => {
    const vendedor = await new Client().login("vendedor2")

    const pipeline = await (await vendedor.request("/pipeline")).text()
    assert.ok(pipeline.includes(id("opp-v2")))
    assert.ok(!pipeline.includes(id("opp-v1")))
    assert.ok(!pipeline.includes(id("opp-livre")))

    const dashboard = await (await vendedor.request("/dashboard")).text()
    assert.ok(dashboard.includes("1.000"))
    assert.ok(!dashboard.includes("7.77"))

    const gestor = await new Client().login("gestor")
    assert.ok((await (await gestor.request("/dashboard")).text()).includes("7.77"))
  })

  it("continua operando o CRM", async () => {
    const vendedor = await new Client().login("vendedor1")
    const company = await vendedor.json("/api/companies", "POST", { name: "Empresa do vendedor" })
    assert.equal(company.status, 201)
  })
})

describe("gestor", () => {
  it("ve toda a organizacao, sem dados de outra", async () => {
    const gestor = await new Client().login("gestor")
    const ids = await listIds(gestor)
    for (const name of ["opp-v1", "opp-v2", "opp-livre"]) assert.ok(ids.includes(id(name)))
    assert.ok(!ids.includes(id("opp-b")))
  })

  it("cria plano, mas nao administra integracoes nem organizacoes", async () => {
    const gestor = await new Client().login("gestor")
    const plan = await gestor.json("/api/action-plans", "POST", {
      title: "Plano do gestor",
      objective: "Objetivo do plano",
    })
    assert.equal(plan.status, 201)
    assert.equal((await gestor.request("/api/settings/integrations")).status, 403)
    assert.equal(
      (await gestor.json("/api/organizations", "POST", { name: "Tentativa" })).status,
      403
    )
  })
})

describe("administrador", () => {
  it("salva e remove integracao, com auditoria e sem expor a chave", async () => {
    const admin = await new Client().login("admin")

    const saved = await admin.json("/api/settings/integrations", "POST", {
      provider: "ANTHROPIC",
      apiKey: FAKE_API_KEY,
    })
    assert.equal(saved.status, 200)
    assert.ok(!(await saved.text()).includes(FAKE_API_KEY))

    const removed = await admin.request("/api/settings/integrations/ANTHROPIC", {
      method: "DELETE",
    })
    assert.equal(removed.status, 200)

    const { rows } = await db.query(
      `select action, "actorUserId", metadata from audit_logs
       where "organizationId" = $1 and action like 'integration.%' order by "createdAt"`,
      [id("org-a")]
    )
    assert.deepEqual(rows.map((row) => row.action), ["integration.saved", "integration.removed"])
    assert.ok(rows.every((row) => row.actorUserId === id("admin")))
    assert.ok(!JSON.stringify(rows).includes(FAKE_API_KEY))
  })

  it("registra quem mudou a etapa", async () => {
    const admin = await new Client().login("admin")
    const response = await admin.json(`/api/opportunities/${id("opp-livre")}`, "PATCH", {
      stage: "NEGOTIATION",
    })
    assert.equal(response.status, 200)

    const { rows } = await db.query(
      `select "actorUserId", metadata from audit_logs
       where action = 'opportunity.stage-changed' and "entityId" = $1`,
      [id("opp-livre")]
    )
    assert.equal(rows.length, 1)
    assert.equal(rows[0].actorUserId, id("admin"))
    assert.deepEqual(rows[0].metadata, { from: "PROSPECTING", to: "NEGOTIATION" })
  })

  it("cria e entra em nova organizacao, com auditoria", async () => {
    const admin = await new Client().login("admin")
    const created = await admin.json("/api/organizations", "POST", { name: `${PREFIX}nova` })
    assert.equal(created.status, 201)
    const organization = await created.json()

    const switched = await admin.json("/api/session/organization", "POST", {
      organizationId: organization.id,
    })
    assert.equal(switched.status, 200)
    assert.equal((await admin.session()).user.organizationId, organization.id)

    const { rows } = await db.query(
      `select action from audit_logs where "organizationId" = $1 order by "createdAt"`,
      [organization.id]
    )
    assert.deepEqual(rows.map((row) => row.action), [
      "organization.created",
      "session.organization-switched",
    ])
  })

  it("mantem as paginas funcionando", async () => {
    const admin = await new Client().login("admin")
    for (const route of [
      "/dashboard",
      "/pipeline",
      "/empresas",
      "/contatos",
      "/planos",
      "/clientes",
      "/configuracoes",
      "/consultor",
      "/sdr",
    ]) {
      const response = await admin.request(route)
      assert.equal(response.status, 200, route)
      assert.ok(!(await response.text()).includes("Acesso restrito"), route)
    }
  })
})

describe("primeiro acesso", () => {
  it("usuario sem vinculo cria o primeiro cliente, mas nao le dados", async () => {
    const novo = await new Client().login("novo")
    assert.equal((await novo.session()).user.organizationId, null)
    assert.equal((await novo.request("/api/opportunities")).status, 401)
    assert.equal((await novo.json("/api/organizations", "POST", { name: `${PREFIX}primeiro` })).status, 201)
  })
})

describe("mudancas valem na sessao ja aberta", () => {
  it("nova permissao e rebaixamento valem sem novo login", async () => {
    const client = await new Client().login("promovido")
    assert.equal((await client.request("/api/settings/integrations")).status, 403)

    await db.query(`update organization_members set role = 'CONSULTANT' where id = $1`, [
      id("promovido"),
    ])
    assert.equal((await client.request("/api/settings/integrations")).status, 200)

    await db.query(`update organization_members set role = 'MEMBER' where id = $1`, [
      id("promovido"),
    ])
    assert.equal((await client.request("/api/settings/integrations")).status, 403)
  })

  it("membro removido perde o acesso na hora", async () => {
    const client = await new Client().login("removido")
    assert.equal((await client.request("/api/companies")).status, 200)

    await db.query(`delete from organization_members where id = $1`, [id("removido")])

    assert.equal((await client.request("/api/companies")).status, 401)
    assert.equal((await client.session()).user.organizationId, null)
  })

  it("usuario excluido nao mantem sessao valida", async () => {
    const client = await new Client().login("excluido")
    await db.query(`delete from users where id = $1`, [id("excluido")])

    assert.equal((await client.request("/api/companies")).status, 401)
    const session = await client.session()
    assert.equal(session?.user, undefined)
  })
})
