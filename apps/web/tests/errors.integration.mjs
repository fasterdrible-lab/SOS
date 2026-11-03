// Testa o formato padronizado dos erros da API (Tarefa V2-1.3) por HTTP.
// Cria apenas registros com o prefixo abaixo, removidos ao final.
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb } from "./support.mjs"

const PREFIX = "errors-test-"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORG = id("org")

async function cleanup() {
  await db.query(`delete from organizations where id = $1`, [ORG])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

before(async () => {
  await db.connect()
  await cleanup()
  await db.query(
    `insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`,
    [ORG]
  )
  const hash = await bcrypt.hash(PASSWORD, 4)
  for (const [name, role] of [
    ["admin", "CONSULTANT"],
    ["vendedor", "MEMBER"],
    ["sem-org", null],
  ]) {
    await db.query(
      `insert into users (id, name, email, "passwordHash", "updatedAt") values ($1, $1, $2, $3, now())`,
      [id(name), email(name), hash]
    )
    if (role) {
      await db.query(
        `insert into organization_members (id, "organizationId", "userId", role) values ($1, $2, $1, $3)`,
        [id(name), ORG, role]
      )
    }
  }
})

after(async () => {
  await cleanup()
  await db.end()
})

async function expectError(response, status, code) {
  assert.equal(response.status, status)
  assert.match(response.headers.get("content-type") ?? "", /application\/json/)
  const body = await response.json()
  assert.equal(body.code, code)
  assert.equal(typeof body.error, "string")
  assert.ok(body.error.length > 0)
  return body
}

describe("formato dos erros", () => {
  it("401 sem organizacao ativa", async () => {
    const client = await login("sem-org")
    await expectError(await client.request("/api/companies"), 401, "UNAUTHENTICATED")
  })

  it("403 sem permissao", async () => {
    const vendedor = await login("vendedor")
    await expectError(await vendedor.request("/api/settings/integrations"), 403, "FORBIDDEN")
  })

  it("400 com JSON malformado", async () => {
    const admin = await login("admin")
    const response = await admin.request("/api/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{nao e json",
    })
    await expectError(response, 400, "BAD_REQUEST")
  })

  it("400 com os campos invalidos", async () => {
    const admin = await login("admin")
    const body = await expectError(
      await admin.json("/api/opportunities", "POST", { title: "", value: -1 }),
      400,
      "BAD_REQUEST"
    )
    assert.ok(body.fields.title)
    assert.ok(body.fields.value)
  })

  it("404 e 422 seguem o mesmo formato", async () => {
    const admin = await login("admin")
    await expectError(
      await admin.json(`/api/opportunities/${id("inexistente")}`, "PATCH", { status: "WON" }),
      404,
      "NOT_FOUND"
    )

    const created = await (
      await admin.json("/api/opportunities", "POST", { title: "Para perder", value: 1 })
    ).json()
    await expectError(
      await admin.json(`/api/opportunities/${created.opportunity.id}`, "PATCH", {
        status: "LOST",
      }),
      422,
      "UNPROCESSABLE"
    )
  })

  it("erro inesperado vira 500 em JSON, sem detalhes internos", async () => {
    // Chave gravada corrompida: decryptSecret lanca fora de qualquer try da rota.
    await db.query(
      `insert into api_integrations (id, "organizationId", provider, "apiKeyEncrypted", "updatedAt")
       values ($1, $2, 'ANTHROPIC', 'conteudo-corrompido', now())`,
      [id("integracao"), ORG]
    )

    const admin = await login("admin")
    const body = await expectError(
      await admin.request("/api/settings/integrations"),
      500,
      "INTERNAL"
    )
    assert.deepEqual(body, { error: "Erro inesperado. Tente novamente.", code: "INTERNAL" })
  })
})
