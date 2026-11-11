// Testa Usuarios e Auditoria (Tarefa V2-9.1) por HTTP, contra o app e o banco
// de desenvolvimento: convites por link, aceite com conta nova e existente,
// troca de papel, remocao e consulta do AuditLog. Cria apenas registros com o
// prefixo abaixo, removidos ao final. Recusa rodar fora de localhost (tests/support.mjs).
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"

import bcrypt from "bcryptjs"

import { Client, PASSWORD, createDb } from "./support.mjs"

const PREFIX = "members-test-"

const db = createDb()
const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const login = (name) => new Client().login(email(name))
const ORG = id("org")
const ORG_B = id("org-b")
const NEW_PASSWORD = "senha-nova-do-convite-123"

async function cleanup() {
  await db.query(`delete from organizations where id = any($1)`, [[ORG, ORG_B]])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

const json = async (response) => ({ status: response.status, body: await response.json() })
const tokenOf = (path) => path.split("/").at(-1)

async function invite(admin, body) {
  return json(await admin.json("/api/settings/invites", "POST", body))
}
const accept = async (token, body) => json(await new Client().json(`/api/invites/${token}`, "POST", body))
const memberIdOf = (name) => id(name)

/** Login com senha qualquer; devolve o cliente e a sessao (sem exigir sucesso). */
async function loginWith(address, password) {
  const client = new Client()
  const csrf = await (await client.request("/api/auth/csrf")).json()
  await client.request("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: address, password }),
  })
  return { client, session: await client.session() }
}

before(async () => {
  await db.connect()
  await cleanup()

  for (const organization of [ORG, ORG_B]) {
    await db.query(`insert into organizations (id, name, slug, "updatedAt") values ($1, $1, $1, now())`, [organization])
  }

  const hash = await bcrypt.hash(PASSWORD, 4)
  for (const [name, organization, role] of [
    ["admin", ORG, "CONSULTANT"],
    ["admin2", ORG, "ADMIN"],
    ["gestor", ORG, "MANAGER"],
    ["vendedor", ORG, "MEMBER"],
    ["sai", ORG, "MEMBER"],
    ["esquece", ORG, "MEMBER"],
    ["externo", ORG_B, "CONSULTANT"],
    ["adminb", ORG_B, "ADMIN"],
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

describe("usuarios: permissao", () => {
  it("so administrador lista, convida e consulta a auditoria", async () => {
    for (const name of ["gestor", "vendedor"]) {
      const client = await login(name)
      assert.equal((await client.request("/api/settings/members")).status, 403, name)
      assert.equal((await client.json("/api/settings/invites", "POST", { email: email("x"), role: "MEMBER" })).status, 403, name)
      assert.equal((await client.json(`/api/settings/members/${memberIdOf("sai")}`, "PATCH", { role: "MANAGER" })).status, 403, name)
      assert.equal((await client.request("/api/settings/audit")).status, 403, name)
      const page = await (await client.request("/configuracoes/usuarios")).text()
      assert.match(page, /Acesso restrito/, name)
    }
    const anonymous = await new Client().request("/api/settings/members")
    assert.notEqual(anonymous.status, 200)
  })

  it("administrador ve as pessoas da propria organizacao", async () => {
    const { status, body } = await json(await (await login("admin")).request("/api/settings/members"))
    assert.equal(status, 200)
    const emails = body.members.map((member) => member.email)
    assert.ok(emails.includes(email("vendedor")))
    assert.ok(!emails.includes(email("externo")))
    const page = await (await (await login("admin")).request("/configuracoes/usuarios")).text()
    assert.match(page, /Convidar pessoa/)
    assert.ok(page.includes(email("gestor")))
  })
})

describe("convites", () => {
  it("conta nova: cria, aceita uma vez e entra com o papel do convite", async () => {
    const admin = await login("admin")
    const created = await invite(admin, { email: `  ${email("novo").toUpperCase()} `, role: "MANAGER" })
    assert.equal(created.status, 201)
    assert.match(created.body.path, /^\/convite\/[A-Za-z0-9_-]{43}$/)
    const token = tokenOf(created.body.path)

    // O banco guarda so o hash; o e-mail e normalizado.
    const stored = await db.query(`select email, "tokenHash" from organization_invites where id = $1`, [created.body.id])
    assert.equal(stored.rows[0].email, email("novo"))
    assert.notEqual(stored.rows[0].tokenHash, token)

    const listed = await json(await admin.request("/api/settings/members"))
    const pending = listed.body.invites.find((item) => item.id === created.body.id)
    assert.equal(pending.state, "PENDING")
    assert.equal(JSON.stringify(listed.body).includes(token), false)

    // Pagina publica, sem sessao e sem redirecionar para o login.
    const page = await new Client().request(created.body.path)
    assert.equal(page.status, 200)
    const html = await page.text()
    assert.ok(html.includes(ORG))
    assert.match(html, /Crie uma senha/)

    assert.equal((await accept(token, { name: "Pessoa Nova", password: "curta" })).status, 400)
    assert.equal((await accept(token, { password: NEW_PASSWORD })).status, 400)
    const accepted = await accept(token, { name: "Pessoa Nova", password: NEW_PASSWORD })
    assert.equal(accepted.status, 201)
    assert.equal(accepted.body.email, email("novo"))
    assert.equal((await accept(token, { name: "Outra", password: NEW_PASSWORD })).status, 409)

    const member = await db.query(
      `select m.role, u.name from organization_members m join users u on u.id = m."userId"
       where m."organizationId" = $1 and u.email = $2`,
      [ORG, email("novo")]
    )
    assert.deepEqual(member.rows, [{ role: "MANAGER", name: "Pessoa Nova" }])

    const { session } = await loginWith(email("novo"), NEW_PASSWORD)
    assert.equal(session.user.organizationId, ORG)
    assert.equal(session.user.role, "MANAGER")

    const usedPage = await (await new Client().request(created.body.path)).text()
    assert.match(usedPage, /já foi usado/)
  })

  it("conta existente: entra com a senha atual, sem criar outra conta", async () => {
    const admin = await login("admin")
    const created = await invite(admin, { email: email("externo"), role: "MEMBER" })
    assert.equal(created.status, 201)
    const token = tokenOf(created.body.path)

    const html = await (await new Client().request(created.body.path)).text()
    assert.match(html, /já tem conta/)

    assert.equal((await accept(token, { password: "senha-errada-qualquer" })).status, 422)
    assert.equal((await accept(token, { password: PASSWORD })).status, 201)

    const rows = await db.query(
      `select m."organizationId", m.role from organization_members m where m."userId" = $1 order by m."organizationId"`,
      [id("externo")]
    )
    assert.deepEqual(rows.rows, [
      { organizationId: ORG, role: "MEMBER" },
      { organizationId: ORG_B, role: "CONSULTANT" },
    ])
    const users = await db.query(`select count(*)::int as total from users where lower(email) = $1`, [email("externo")])
    assert.equal(users.rows[0].total, 1)
  })

  it("o login abre a ultima organizacao usada: a do convite e, depois, a escolhida", async () => {
    // externo pertence a ORG_B desde antes e acabou de aceitar o convite de ORG.
    const afterInvite = await login("externo")
    assert.equal((await afterInvite.session()).user.organizationId, ORG)

    const switched = await afterInvite.json("/api/session/organization", "POST", { organizationId: ORG_B })
    assert.equal(switched.status, 200)
    assert.equal((await (await login("externo")).session()).user.organizationId, ORG_B)

    // Vinculo da ultima organizacao removido: volta para a mais antiga que restou.
    await db.query(`update users set "lastOrganizationId" = $2 where id = $1`, [id("externo"), id("org-inexistente")])
    assert.equal((await (await login("externo")).session()).user.organizationId, ORG_B)
    await db.query(`update users set "lastOrganizationId" = $2 where id = $1`, [id("externo"), ORG_B])
  })

  it("quem ja e membro nao recebe convite", async () => {
    const result = await invite(await login("admin"), { email: email("vendedor").toUpperCase(), role: "MEMBER" })
    assert.equal(result.status, 409)
    assert.equal((await invite(await login("admin"), { email: "nao-e-email", role: "MEMBER" })).status, 400)
    assert.equal((await invite(await login("admin"), { email: email("y"), role: "OWNER" })).status, 400)
  })

  it("novo convite para o mesmo e-mail cancela o anterior; revogado e expirado nao valem", async () => {
    const admin = await login("admin")
    const first = await invite(admin, { email: email("repetido"), role: "MEMBER" })
    const second = await invite(admin, { email: email("repetido"), role: "MANAGER" })
    assert.equal(second.status, 201)
    assert.equal((await accept(tokenOf(first.body.path), { name: "Repetido", password: NEW_PASSWORD })).status, 409)

    assert.equal((await admin.request(`/api/settings/invites/${second.body.id}`, { method: "DELETE" })).status, 200)
    assert.equal((await admin.request(`/api/settings/invites/${second.body.id}`, { method: "DELETE" })).status, 409)
    assert.equal((await accept(tokenOf(second.body.path), { name: "Repetido", password: NEW_PASSWORD })).status, 409)
    assert.match(await (await new Client().request(second.body.path)).text(), /foi cancelado/)

    const expired = await invite(admin, { email: email("expira"), role: "MEMBER" })
    await db.query(`update organization_invites set "expiresAt" = now() - interval '1 minute' where id = $1`, [expired.body.id])
    assert.equal((await accept(tokenOf(expired.body.path), { name: "Expira", password: NEW_PASSWORD })).status, 409)
    const listed = await json(await admin.request("/api/settings/members"))
    assert.equal(listed.body.invites.find((item) => item.id === expired.body.id).state, "EXPIRED")

    const users = await db.query(`select count(*)::int as total from users where email = any($1)`, [[email("repetido"), email("expira")]])
    assert.equal(users.rows[0].total, 0)
  })

  it("token desconhecido ou de outra organizacao", async () => {
    assert.equal((await accept("A".repeat(43), { name: "Fulano", password: NEW_PASSWORD })).status, 404)
    assert.equal((await accept("curto", { name: "Fulano", password: NEW_PASSWORD })).status, 404)
    const page = await new Client().request(`/convite/${"A".repeat(43)}`)
    assert.equal(page.status, 200)
    assert.match(await page.text(), /Convite não encontrado/)

    const other = await invite(await login("adminb"), { email: email("de-b"), role: "MEMBER" })
    assert.equal(other.status, 201)
    const revoke = await (await login("admin")).request(`/api/settings/invites/${other.body.id}`, { method: "DELETE" })
    assert.equal(revoke.status, 404)
  })
})

describe("nova senha", () => {
  const SENHA_NOVA = "outra-senha-nova-123456"
  const resetFor = async (admin, name) =>
    json(await admin.request(`/api/settings/members/${memberIdOf(name)}/password-reset`, { method: "POST" }))
  const redeem = async (token, password) =>
    json(await new Client().json(`/api/password-resets/${token}`, "POST", { password }))

  it("administrador gera o link; a pessoa grava a senha nova uma vez", async () => {
    const admin = await login("admin")
    const created = await resetFor(admin, "esquece")
    assert.equal(created.status, 201)
    assert.match(created.body.path, /^\/redefinir-senha\/[A-Za-z0-9_-]{43}$/)
    const token = tokenOf(created.body.path)

    // Ate o link ser usado, a senha atual continua valendo.
    assert.equal((await loginWith(email("esquece"), PASSWORD)).session?.user?.email, email("esquece"))

    const page = await new Client().request(created.body.path)
    assert.equal(page.status, 200)
    const html = await page.text()
    assert.match(html, /Criar nova senha/)
    assert.ok(html.includes(email("esquece")))

    assert.equal((await redeem(token, "curta")).status, 400)
    assert.equal((await redeem(token, SENHA_NOVA)).status, 200)
    assert.equal((await redeem(token, "mais-uma-senha-123456")).status, 409)
    assert.match(await (await new Client().request(created.body.path)).text(), /já foi usado/)

    assert.equal((await loginWith(email("esquece"), SENHA_NOVA)).session?.user?.email, email("esquece"))
    assert.equal((await loginWith(email("esquece"), PASSWORD)).session?.user, undefined)

    const stored = await db.query(`select "tokenHash" from password_resets where "userId" = $1`, [id("esquece")])
    assert.ok(stored.rows.every((row) => row.tokenHash !== token))
  })

  it("link novo substitui o anterior; expirado nao vale", async () => {
    const admin = await login("admin")
    const first = await resetFor(admin, "esquece")
    const second = await resetFor(admin, "esquece")
    assert.equal((await redeem(tokenOf(first.body.path), SENHA_NOVA)).status, 409)

    await db.query(`update password_resets set "expiresAt" = now() - interval '1 minute' where "userId" = $1 and "usedAt" is null and "revokedAt" is null`, [id("esquece")])
    assert.equal((await redeem(tokenOf(second.body.path), SENHA_NOVA)).status, 409)
    assert.match(await (await new Client().request(second.body.path)).text(), /expirou/)
    assert.equal((await redeem("A".repeat(43), SENHA_NOVA)).status, 404)
  })

  it("so administrador, so na propria organizacao e nunca para conta compartilhada", async () => {
    assert.equal((await resetFor(await login("gestor"), "esquece")).status, 403)
    assert.equal((await resetFor(await login("admin"), "adminb")).status, 404)
    // externo esta em ORG (vinculo criado pelo convite) e em ORG_B: um administrador
    // de uma nao muda a senha da outra.
    const admin = await login("admin")
    const listed = await json(await admin.request("/api/settings/members"))
    const shared = listed.body.members.find((member) => member.userId === id("externo"))
    assert.equal(shared.sharedAccount, true)
    const refused = await json(await admin.request(`/api/settings/members/${shared.id}/password-reset`, { method: "POST" }))
    assert.equal(refused.status, 422)
    assert.equal(listed.body.members.find((member) => member.userId === id("esquece")).sharedAccount, false)
  })

  it("o login orienta quem esqueceu a senha", async () => {
    assert.match(await (await new Client().request("/login")).text(), /Esqueci a senha/)
  })
})

describe("papel e remocao", () => {
  it("troca o papel, com auditoria do antes e depois", async () => {
    const admin = await login("admin")
    const changed = await json(await admin.json(`/api/settings/members/${memberIdOf("vendedor")}`, "PATCH", { role: "MANAGER" }))
    assert.equal(changed.status, 200)
    assert.equal((await (await login("vendedor")).session()).user.role, "MANAGER")

    assert.equal((await admin.json(`/api/settings/members/${memberIdOf("vendedor")}`, "PATCH", { role: "MANAGER" })).status, 409)
    assert.equal((await admin.json(`/api/settings/members/${memberIdOf("admin")}`, "PATCH", { role: "MEMBER" })).status, 422)
    assert.equal((await admin.json(`/api/settings/members/${memberIdOf("externo")}`, "PATCH", { role: "MEMBER" })).status, 404)
    assert.equal((await admin.json(`/api/settings/members/${memberIdOf("gestor")}`, "PATCH", { role: "CONSULTANT" })).status, 400)

    // Com dois administradores, um rebaixa o outro.
    assert.equal((await admin.json(`/api/settings/members/${memberIdOf("admin2")}`, "PATCH", { role: "MEMBER" })).status, 200)

    const audit = await db.query(
      `select "actorUserId", metadata from audit_logs where "organizationId" = $1 and action = 'member.role-changed' and "entityId" = $2`,
      [ORG, memberIdOf("vendedor")]
    )
    assert.deepEqual(audit.rows, [{ actorUserId: id("admin"), metadata: { from: "MEMBER", to: "MANAGER" } }])
  })

  it("remove o vinculo: a pessoa perde o acesso na hora e a conta continua", async () => {
    const leaving = await login("sai")
    assert.equal((await leaving.request("/api/meu-dia")).status, 200)

    const admin = await login("admin")
    assert.equal((await admin.request(`/api/settings/members/${memberIdOf("admin")}`, { method: "DELETE" })).status, 422)
    assert.equal((await admin.request(`/api/settings/members/${memberIdOf("sai")}`, { method: "DELETE" })).status, 200)
    assert.equal((await admin.request(`/api/settings/members/${memberIdOf("sai")}`, { method: "DELETE" })).status, 404)

    assert.notEqual((await leaving.request("/api/meu-dia")).status, 200)
    const users = await db.query(`select count(*)::int as total from users where id = $1`, [id("sai")])
    assert.equal(users.rows[0].total, 1)
  })
})

describe("auditoria", () => {
  it("lista as operacoes da organizacao com filtros, sem dados pessoais", async () => {
    const admin = await login("admin")
    const all = await json(await admin.request("/api/settings/audit"))
    assert.equal(all.status, 200)
    const actions = new Set(all.body.entries.map((entry) => entry.action))
    for (const action of [
      "member.invited",
      "member.joined",
      "member.invite-revoked",
      "member.role-changed",
      "member.removed",
      "member.password-reset-created",
      "member.password-reset",
    ]) {
      assert.ok(actions.has(action), action)
    }
    assert.equal(all.body.nextCursor, null)
    // Nenhum e-mail convidado nem token no registro.
    assert.equal(JSON.stringify(all.body).includes("@exemplo.test"), false)

    const filtered = await json(await admin.request("/api/settings/audit?acao=member.removed"))
    assert.deepEqual(filtered.body.entries.map((entry) => entry.label), ["Pessoa removida"])

    const byActor = await json(await admin.request(`/api/settings/audit?pessoa=${id("externo")}`))
    assert.ok(byActor.body.entries.length > 0)
    assert.ok(byActor.body.entries.every((entry) => entry.actor?.id === id("externo")))

    // Outra organizacao nao ve estas entradas.
    const other = await json(await (await login("adminb")).request("/api/settings/audit"))
    assert.equal(other.body.entries.some((entry) => entry.action === "member.removed"), false)

    const page = await (await admin.request("/configuracoes/auditoria?acao=member.role-changed")).text()
    assert.match(page, /Papel alterado/)
  })
})
