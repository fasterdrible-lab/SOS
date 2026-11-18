import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb } from "./support.mjs"

const PREFIX = "manual-test-"

const db = createDb()
const ORG = `${PREFIX}org`
const SELLER = `${PREFIX}vendedor@exemplo.test`

async function cleanup() {
  await db.query(`delete from organizations where id = $1`, [ORG])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

const html = async (client, path) => {
  const response = await client.request(path)
  return { status: response.status, text: await response.text() }
}

before(async () => {
  await db.connect()
  await cleanup()
  await db.query(`insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`, [ORG])
  const hash = await bcrypt.hash(PASSWORD, 4)
  await db.query(`insert into users (id, name, email, "passwordHash", "updatedAt") values ($1, $1, $2, $3, now())`, [
    `${PREFIX}vendedor`,
    SELLER,
    hash,
  ])
  await db.query(`insert into organization_members (id, "organizationId", "userId", role) values ($1, $2, $1, 'MEMBER')`, [
    `${PREFIX}vendedor`,
    ORG,
  ])
})

after(async () => {
  await cleanup()
  await db.end()
})

describe("manual do usuario (V2-12)", () => {
  it("sem sessao leva ao login", async () => {
    const response = await new Client().request("/manual")
    assert.equal(response.status, 307)
    assert.match(response.headers.get("location") ?? "", /\/login/)
  })

  it("vendedor ve o indice com os grupos e o item no menu", async () => {
    const client = await new Client().login(SELLER)
    const { status, text } = await html(client, "/manual")
    assert.equal(status, 200)
    assert.match(text, /Manual do Usuário/)
    assert.match(text, /Primeiros passos/)
    assert.match(text, /Administração/)
    assert.match(text, /href="\/manual\/equipes"/)
    assert.match(text, /href="\/manual"/)
  })

  it("busca sem acento filtra os assuntos", async () => {
    const client = await new Client().login(SELLER)
    const { status, text } = await html(client, "/manual?q=configuracoes%20comerciais")
    assert.equal(status, 200)
    assert.match(text, /href="\/manual\/configuracoes-comerciais"/)
    assert.doesNotMatch(text, /href="\/manual\/ia-sdr"/)
    const empty = await html(client, "/manual?q=palavra-inexistente-no-manual")
    assert.match(empty.text, /Nada encontrado/)
  })

  it("artigo mostra os 9 itens e o video; slug desconhecido e 404", async () => {
    const client = await new Client().login(SELLER)
    const { status, text } = await html(client, "/manual/equipes")
    assert.equal(status, 200)
    for (const title of ["Objetivo", "Quando utilizar", "Como acessar", "Passo a passo", "Exemplo prático", "Resultados esperados", "Principais dúvidas", "Erros comuns", "Limitações"]) {
      assert.match(text, new RegExp(title), title)
    }
    assert.match(text, /Vídeo demonstrativo em preparação/)
    assert.match(text, /href="\/configuracoes\/usuarios"/)
    assert.equal((await client.request("/manual/nao-existe")).status, 404)
  })
})
