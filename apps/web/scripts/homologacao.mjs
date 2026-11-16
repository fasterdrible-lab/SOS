// Roteiro de homologacao (Tarefa V2-10): monta um cliente de exemplo pelas APIs,
// abre as telas em Chrome real com cada papel (administrador, gestor com equipe e
// vendedor), em desktop, celular e tema claro, e registra status HTTP, erros do
// navegador, rolagem lateral e capturas de tela.
//
// Uso (app em localhost:3100 e banco local, como nos testes de integracao):
//   npm run homologacao
// Variaveis: HOMOLOG_OUT (pasta das capturas), HOMOLOG_KEEP=1 (nao apaga os dados),
// CHROME_PATH (executavel do Chrome ou Edge).
// Recusa rodar fora de localhost (tests/support.mjs). Nao faz parte do CI.
import { spawn } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { setTimeout as sleep } from "node:timers/promises"

import bcrypt from "bcryptjs"

import { BASE_URL, Client, PASSWORD, createDb, ensurePipelines, stageIdOf } from "../tests/support.mjs"

const PREFIX = "homolog-"
const ORG = `${PREFIX}org`
const OUT = process.env.HOMOLOG_OUT ?? path.join(tmpdir(), "salesos-homologacao")
const DEBUG_PORT = 9339

const id = (name) => `${PREFIX}${name}`
const email = (name) => `${PREFIX}${name}@exemplo.test`
const db = createDb()

// ---------------------------------------------------------------- dados

async function cleanup() {
  await db.query(`delete from activities where "organizationId" = $1`, [ORG])
  await db.query(`delete from organizations where id = $1`, [ORG])
  await db.query(`delete from users where email like $1`, [`${PREFIX}%`])
}

const brasiliaDay = (date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date)

async function expectOk(response, what) {
  if (response.status >= 400) throw new Error(`${what}: HTTP ${response.status} ${await response.text()}`)
  return response.json().catch(() => null)
}

/** Procura, em qualquer lista da resposta, o registro com esse nome ou titulo. */
function findByLabel(payload, label) {
  const stack = [payload]
  while (stack.length > 0) {
    const value = stack.pop()
    if (Array.isArray(value)) stack.push(...value)
    else if (value && typeof value === "object") {
      if ((value.name === label || value.title === label) && typeof value.id === "string") return value
      stack.push(...Object.values(value))
    }
  }
  throw new Error(`registro "${label}" nao encontrado`)
}

async function seed() {
  await cleanup()
  await db.query(`insert into organizations (id, name, slug, "updatedAt") values ($1, 'Homolog Cliente', $1, now())`, [ORG])
  await ensurePipelines(db, [ORG])

  const hash = await bcrypt.hash(PASSWORD, 4)
  for (const [name, label, role] of [
    ["admin", "Homolog Admin", "ADMIN"],
    ["gestor", "Homolog Gestora", "MANAGER"],
    ["vendedor", "Homolog Vendedor", "MEMBER"],
    ["vendedor2", "Homolog Vendedora B", "MEMBER"],
  ]) {
    await db.query(
      `insert into users (id, name, email, "passwordHash", "updatedAt") values ($1, $2, $3, $4, now())`,
      [id(name), label, email(name), hash]
    )
    await db.query(
      `insert into organization_members (id, "organizationId", "userId", role) values ($1, $2, $1, $3)`,
      [id(name), ORG, role]
    )
  }

  const admin = await new Client().login(email("admin"))
  const seller = await new Client().login(email("vendedor"))
  const seller2 = await new Client().login(email("vendedor2"))
  const post = async (client, url, body, method = "POST") => expectOk(await client.json(url, method, body), `${method} ${url}`)
  const get = async (client, url) => expectOk(await client.request(url), `GET ${url}`)

  // Equipes: gestora e vendedor na A, vendedora B na B.
  const teamA = await post(admin, "/api/settings/teams", { name: "Homolog Equipe A" })
  const teamB = await post(admin, "/api/settings/teams", { name: "Homolog Equipe B" })
  for (const [member, team] of [["gestor", teamA], ["vendedor", teamA], ["vendedor2", teamB]]) {
    await post(admin, `/api/settings/members/${id(member)}`, { teamId: team.id }, "PATCH")
  }

  // Metas do mes.
  const month = brasiliaDay(new Date()).slice(0, 7)
  await post(admin, "/api/goals", { month, amount: 50000 }, "PUT")
  await post(admin, "/api/goals", { month, userId: id("vendedor"), amount: 20000 }, "PUT")

  // CRM.
  await post(seller, "/api/companies", { name: "Homolog Alfa Ltda", segment: "Software" })
  await post(seller, "/api/companies", { name: "Homolog Beta SA", segment: "Industria" })
  const companies = await get(seller, "/api/companies")
  const alfa = findByLabel(companies, "Homolog Alfa Ltda")
  const beta = findByLabel(companies, "Homolog Beta SA")
  await post(seller, "/api/contacts", { name: "Homolog Ana Souza", companyId: alfa.id, role: "Diretora", email: "ana@alfa.exemplo.test" })
  const contact = findByLabel(await get(seller, "/api/contacts"), "Homolog Ana Souza")

  // Negociacoes pelo vendedor (dono = quem cria), movidas pelas regras reais.
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  const deals = [
    ["Homolog Negocio Proposta", 12000, alfa.id, "PROPOSAL", { expectedClose: yesterday, contactId: contact.id }],
    ["Homolog Negocio Parado", 8000, beta.id, "QUALIFICATION", {}],
    ["Homolog Venda Ganha", 15000, alfa.id, "NEGOTIATION", {}],
    ["Homolog Negocio Perdido", 5000, beta.id, "PROSPECTING", {}],
  ]
  for (const [title, value, companyId, stage, extra] of deals) {
    await post(seller, "/api/opportunities", { title, value, companyId, stageId: stageIdOf(ORG, stage), ...extra })
  }
  await post(seller2, "/api/opportunities", { title: "Homolog Negocio Equipe B", value: 7000, companyId: beta.id })
  const mine = await get(seller, "/api/opportunities")
  const proposal = findByLabel(mine, "Homolog Negocio Proposta")
  const stalled = findByLabel(mine, "Homolog Negocio Parado")
  const won = findByLabel(mine, "Homolog Venda Ganha")
  const lost = findByLabel(mine, "Homolog Negocio Perdido")
  const teamBDeal = findByLabel(await get(seller2, "/api/opportunities"), "Homolog Negocio Equipe B")
  await post(seller, `/api/opportunities/${won.id}`, { status: "WON" }, "PATCH")
  await post(seller, `/api/opportunities/${lost.id}`, { status: "LOST", lostReason: "Preco acima do orcamento" }, "PATCH")
  await db.query(`update opportunities set "stageChangedAt" = now() - interval '40 days' where id = $1`, [stalled.id])

  // Atividades: reuniao hoje, follow-up atrasado, tarefa futura e uma concluida.
  const inHours = (hours) => new Date(Date.now() + hours * 3600000).toISOString()
  const activities = [
    ["MEETING", "Homolog Reuniao de proposta", inHours(1), proposal.id],
    ["FOLLOW_UP", "Homolog Follow-up atrasado", inHours(-48), stalled.id],
    ["TASK", "Homolog Enviar contrato", inHours(72), proposal.id],
    ["CALL", "Homolog Ligacao feita", inHours(-2), proposal.id],
  ]
  for (const [type, title, dueDate, opportunityId] of activities) {
    await post(seller, "/api/activities", { type, title, dueDate, opportunityId })
  }
  const done = findByLabel(await get(seller, "/api/activities"), "Homolog Ligacao feita")
  await post(seller, `/api/activities/${done.id}`, { completed: true }, "PATCH")

  // Plano de acao e dia de ontem fechado.
  await post(admin, "/api/action-plans", { title: "Homolog Plano Comercial", objective: "Organizar o funil" })
  const plan = findByLabel(await get(admin, "/api/action-plans"), "Homolog Plano Comercial")
  await post(seller, "/api/reports/daily", { day: brasiliaDay(new Date(Date.now() - 86400000)), notes: "Dia fechado na homologacao" })

  // Reuniao do SALEIA (o recebimento por webhook tem teste proprio): oferta nao apresentada e insights.
  await db.query(
    `insert into saleia_meetings (id, "organizationId", "externalId", title, "startedAt", participants, summary, "companyId", "contactId", "opportunityId",
       "analyzedAt", "offerPresented", "offerReason", "diagnosisStatus", "updatedAt")
     values ($1, $2, $1, 'Homolog Reuniao SALEIA', now() - interval '1 hour', '[]', 'Cliente pediu proposta revisada.', $3, $4, $5,
       now(), false, 'A reuniao ficou no levantamento de dores.', 'PENDING', now())`,
    [id("reuniao"), ORG, alfa.id, contact.id, proposal.id]
  )
  const insights = [
    ["RECOMMENDATION", "Enviar proposta revisada ate sexta", null],
    ["STAGE_SUGGESTION", "Cliente quer negociar condicoes", "Negociacao"],
    ["OBJECTION", "Preco acima do previsto", null],
  ]
  for (const [index, [kind, text, stageName]] of insights.entries()) {
    await db.query(
      `insert into saleia_insights (id, "organizationId", "meetingId", kind, text, quote, "stageName", "dueDate", position, "updatedAt")
       values ($1, $2, $3, $4, $5, null, $6, null, $7, now())`,
      [id(`insight-${index}`), ORG, id("reuniao"), kind, text, stageName, index]
    )
  }

  return { alfa, proposal, teamBDeal, plan }
}

// ---------------------------------------------------------------- navegador

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ]
  const found = candidates.find((candidate) => candidate && existsSync(candidate))
  if (!found) throw new Error("Chrome nao encontrado; informe CHROME_PATH.")
  return found
}

/** Cliente minimo do protocolo do Chrome (CDP), com o WebSocket do proprio Node. */
class Browser {
  nextId = 1
  pending = new Map()
  listeners = new Map()

  static async launch() {
    const profile = mkdtempSync(path.join(tmpdir(), "salesos-chrome-"))
    const child = spawn(
      findChrome(),
      [
        "--headless=new",
        `--remote-debugging-port=${DEBUG_PORT}`,
        `--user-data-dir=${profile}`,
        "--no-first-run",
        "--disable-gpu",
        "--hide-scrollbars",
        "about:blank",
      ],
      { stdio: "ignore" }
    )
    let version = null
    for (let attempt = 0; attempt < 50 && !version; attempt++) {
      await sleep(200)
      version = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then((r) => r.json()).catch(() => null)
    }
    if (!version) throw new Error("Chrome nao respondeu na porta de depuracao.")
    const browser = new Browser()
    browser.child = child
    browser.profile = profile
    browser.socket = new WebSocket(version.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      browser.socket.addEventListener("open", resolve)
      browser.socket.addEventListener("error", reject)
    })
    browser.socket.addEventListener("message", (event) => browser.receive(JSON.parse(event.data)))
    return browser
  }

  receive(message) {
    if (message.id) {
      const waiter = this.pending.get(message.id)
      this.pending.delete(message.id)
      if (message.error) waiter?.reject(new Error(`${waiter.method}: ${message.error.message}`))
      else waiter?.resolve(message.result)
      return
    }
    for (const listener of this.listeners.get(message.sessionId) ?? []) listener(message.method, message.params)
  }

  send(method, params = {}, sessionId) {
    const messageId = this.nextId++
    this.socket.send(JSON.stringify({ id: messageId, method, params, sessionId }))
    return new Promise((resolve, reject) => this.pending.set(messageId, { resolve, reject, method }))
  }

  /** Aba nova em contexto isolado (cookies proprios): uma por papel. */
  async newPage({ width, height, mobile = false }) {
    const { browserContextId } = await this.send("Target.createBrowserContext")
    const { targetId } = await this.send("Target.createTarget", { url: "about:blank", browserContextId })
    const { sessionId } = await this.send("Target.attachToTarget", { targetId, flatten: true })
    const page = new Page(this, sessionId)
    this.listeners.set(sessionId, [(method, params) => page.onEvent(method, params)])
    for (const domain of ["Page", "Network", "Runtime", "Log"]) await page.send(`${domain}.enable`)
    await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile })
    return page
  }

  async close() {
    await this.send("Browser.close").catch(() => {})
    await sleep(500)
    this.child.kill()
    // No Windows o Chrome pode segurar o perfil por instantes; sobra na pasta temporaria.
    try {
      rmSync(this.profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
    } catch {}
  }
}

class Page {
  problems = []
  documentStatus = null
  loaded = null

  constructor(browser, sessionId) {
    this.browser = browser
    this.sessionId = sessionId
  }

  send(method, params) {
    return this.browser.send(method, params, this.sessionId)
  }

  onEvent(method, params) {
    if (method === "Page.loadEventFired") this.loaded?.()
    if (method === "Network.responseReceived") {
      const { status, url } = params.response
      if (params.type === "Document") this.documentStatus = status
      else if (status >= 400) this.problems.push(`HTTP ${status} em ${new URL(url).pathname}`)
    }
    if (method === "Runtime.exceptionThrown") {
      const details = params.exceptionDetails
      this.problems.push(`excecao: ${details.exception?.description?.split("\n")[0] ?? details.text}`)
    }
    if (method === "Runtime.consoleAPICalled" && params.type === "error") {
      this.problems.push(`console.error: ${params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ").slice(0, 200)}`)
    }
    if (method === "Log.entryAdded" && params.entry.level === "error" && !/Failed to load resource/.test(params.entry.text)) {
      this.problems.push(`log: ${params.entry.text.slice(0, 200)}`)
    }
  }

  /** Abre o endereco e devolve o status do documento e os problemas vistos. */
  async open(pathname) {
    this.problems = []
    this.documentStatus = null
    const loaded = new Promise((resolve) => (this.loaded = resolve))
    await this.send("Page.navigate", { url: `${BASE_URL}${pathname}` })
    await Promise.race([loaded, sleep(15000)])
    await sleep(700)
    return this.documentStatus
  }

  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
    return result.value
  }

  text() {
    return this.evaluate("document.body.innerText")
  }

  async waitFor(expression, what, timeout = 8000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      if (await this.evaluate(`Boolean(${expression})`).catch(() => false)) return
      await sleep(150)
    }
    throw new Error(`esperava: ${what}`)
  }

  /** Clique com o mouse de verdade no centro do elemento. */
  async click(selectorExpression, what) {
    const box = await this.evaluate(`(() => {
      const element = ${selectorExpression}
      if (!element) return null
      element.scrollIntoView({ block: "center" })
      const rect = element.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    })()`)
    if (!box) throw new Error(`nao achei: ${what}`)
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
      await this.send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", buttons: 1, clickCount: 1 })
    }
  }

  /** Foca o campo, troca o conteudo e digita como o teclado faria. */
  async type(selector, value) {
    const found = await this.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)})
      if (!element) return false
      element.focus()
      element.select?.()
      return true
    })()`)
    if (!found) throw new Error(`nao achei o campo ${selector}`)
    await this.send("Input.insertText", { text: value })
  }

  async screenshot(name) {
    const { data } = await this.send("Page.captureScreenshot", { format: "png" })
    writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"))
  }

  async login(name) {
    await this.open("/login")
    await this.type("#email", email(name))
    await this.type("#password", PASSWORD)
    await this.click(`document.querySelector('button[type="submit"]')`, "botao Entrar")
    await this.waitFor(`location.pathname === "/meu-dia"`, `login de ${name} chegar ao Meu Dia`, 15000)
    await sleep(500)
  }
}

const button = (label) =>
  `[...document.querySelectorAll("button, [role=menuitem], a")].find((element) => element.innerText.trim() === ${JSON.stringify(label)})`

// ---------------------------------------------------------------- roteiro

const results = []

function record(group, name, problems) {
  results.push({ group, name, ok: problems.length === 0, problems })
  console.log(`${problems.length === 0 ? "ok  " : "FALHA"} ${group} | ${name}${problems.length ? `\n      ${problems.join("\n      ")}` : ""}`)
}

/**
 * Abre a tela e confere status, textos esperados, erros do navegador e rolagem
 * lateral. `expect`: "ok" (200 com os textos), "denied" (Acesso restrito) ou 404.
 */
async function visit(page, group, pathname, { texts = [], expect = "ok", shot } = {}) {
  const problems = []
  try {
    const status = await page.open(pathname)
    const body = await page.text()
    if (expect === 404) {
      if (status !== 404) problems.push(`esperava 404, veio ${status}`)
    } else {
      if (status !== 200) problems.push(`status ${status}`)
      if (expect === "denied" && !body.includes("Acesso restrito")) problems.push(`esperava "Acesso restrito"`)
      if (expect === "ok" && body.includes("Acesso restrito")) problems.push("acesso negado")
      // Sem diferenciar maiusculas: rotulos em caixa alta por CSS chegam assim no innerText.
      const lower = body.toLowerCase()
      for (const text of texts) if (!lower.includes(text.toLowerCase())) problems.push(`faltou o texto "${text}"`)
      if (/Application error|Internal Server Error/.test(body)) problems.push("tela de erro")
    }
    const overflow = await page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    if (overflow > 1) problems.push(`rolagem lateral de ${overflow}px`)
    problems.push(...page.problems.filter((problem) => !(expect === 404 && problem.startsWith("HTTP 404"))))
    if (shot) await page.screenshot(shot)
  } catch (error) {
    problems.push(`erro: ${error.message}`)
  }
  record(group, pathname, problems)
}

async function step(group, name, action) {
  const problems = []
  try {
    await action()
  } catch (error) {
    problems.push(error.message)
  }
  record(group, name, problems)
}

async function run(data) {
  const browser = await Browser.launch()
  try {
    const desktop = { width: 1440, height: 900 }

    // ---- Administrador: todas as telas.
    const admin = await browser.newPage(desktop)
    await step("admin", "login pelo formulario", () => admin.login("admin"))
    const adminScreens = [
      ["/meu-dia", ["Negociações esfriando", "Homolog Negocio Parado", "Homolog Reuniao de proposta"], "admin-meu-dia"],
      ["/dashboard", ["Esfriando", "Toda a organização"], "admin-dashboard"],
      ["/pipeline", ["Prospecção", "Homolog Negocio Proposta", "Homolog Negocio Equipe B"], "admin-pipeline"],
      [`/pipeline/${data.proposal.id}`, ["Homolog Negocio Proposta", "Homolog Alfa Ltda", "Homolog Reuniao SALEIA"], "admin-negociacao"],
      ["/atividades", ["Homolog Follow-up atrasado", "Homolog Enviar contrato"], "admin-atividades"],
      ["/report", [], "admin-report"],
      ["/report?aba=fechados", ["Homolog Vendedor"], "admin-report-fechados"],
      ["/empresas", ["Homolog Alfa Ltda", "Homolog Beta SA"], "admin-empresas"],
      [`/empresas/${data.alfa.id}`, ["Homolog Alfa Ltda", "Homolog Ana Souza", "Homolog Negocio Proposta"], "admin-empresa-360"],
      ["/contatos", ["Homolog Ana Souza"], "admin-contatos"],
      ["/saleia", ["Homolog Reuniao SALEIA"], "admin-saleia"],
      [`/saleia/${id("reuniao")}`, ["Enviar proposta revisada ate sexta", "Preco acima do previsto"], "admin-saleia-reuniao"],
      ["/sdr", [], "admin-sdr"],
      ["/consultor", [], "admin-consultor"],
      ["/diagnostico", [], "admin-diagnostico"],
      ["/planos", ["Homolog Plano Comercial"], "admin-planos"],
      [`/planos/${data.plan.id}`, ["Homolog Plano Comercial"], "admin-plano"],
      ["/clientes", ["Homolog Cliente"], "admin-clientes"],
      ["/configuracoes", ["Integrações"], "admin-configuracoes"],
      ["/configuracoes/usuarios", ["Equipes (2)", "Homolog Equipe A", "Homolog Gestora"], "admin-usuarios"],
      ["/configuracoes/comercial", ["Configurações comerciais", "Feriados (0)"], "admin-comercial"],
      ["/configuracoes/auditoria", ["Equipe criada"], "admin-auditoria"],
    ]
    for (const [pathname, texts, shot] of adminScreens) await visit(admin, "admin", pathname, { texts, shot })

    // ---- Interacoes reais do administrador.
    await step("admin", "busca global (botao Buscar) encontra a empresa", async () => {
      await admin.open("/meu-dia")
      await admin.click(`document.querySelector('button[aria-label="Buscar"]')`, "botao Buscar")
      await admin.waitFor(`document.querySelector('input[aria-label="Termo da busca"]')`, "campo da busca")
      await admin.type('input[aria-label="Termo da busca"]', "Homolog Alfa")
      await admin.waitFor(
        `document.querySelector('[role="listbox"]')?.innerText.includes("Homolog Alfa Ltda")`,
        "resultado com a empresa"
      )
      await admin.screenshot("admin-busca")
    })

    await step("admin", "configuracoes comerciais: salvar 30 dias e ver no Meu Dia", async () => {
      await admin.open("/configuracoes/comercial")
      await admin.type("#cooling-days", "30")
      await admin.click(button("Salvar"), "botao Salvar")
      await admin.waitFor(`document.body.innerText.includes("Configurações salvas")`, "aviso de salvo")
      await admin.open("/meu-dia")
      const body = await admin.text()
      if (!body.includes("há mais de 30 dias")) throw new Error("Meu Dia nao mostra o limite de 30 dias")
      if (!body.includes("Homolog Negocio Parado")) throw new Error("a negociacao parada ha 40 dias deveria esfriar")
    })

    await step("admin", "equipes: criar pela tela", async () => {
      await admin.open("/configuracoes/usuarios")
      await admin.type("#team-name", "Homolog Equipe C")
      await admin.click(button("Criar equipe"), "botao Criar equipe")
      await admin.waitFor(`document.body.innerText.includes("Equipes (3)")`, "contagem de 3 equipes")
    })

    await step("admin", "tema claro pelo botao do cabecalho", async () => {
      await admin.open("/meu-dia")
      await admin.click(`document.querySelector('button[aria-label="Usar tema claro"]')`, "botao de tema")
      await admin.waitFor(`!document.documentElement.classList.contains("dark")`, "pagina no tema claro")
    })
    for (const [pathname, shot] of [
      ["/meu-dia", "claro-meu-dia"],
      ["/dashboard", "claro-dashboard"],
      ["/pipeline", "claro-pipeline"],
      ["/report", "claro-report"],
      [`/saleia/${id("reuniao")}`, "claro-saleia-reuniao"],
      ["/configuracoes/usuarios", "claro-usuarios"],
      ["/configuracoes/comercial", "claro-comercial"],
    ]) {
      await visit(admin, "admin tema claro", pathname, { shot })
    }

    await step("admin", "sair pelo menu do usuario", async () => {
      await admin.open("/meu-dia")
      await admin.click(`document.querySelector('button[aria-label="Menu do usuário"]')`, "menu do usuario")
      await admin.waitFor(button("Sair"), "item Sair")
      await admin.click(button("Sair"), "item Sair")
      await admin.waitFor(`location.pathname === "/login"`, "voltar ao login", 15000)
    })

    // ---- Gestora com equipe: ve a equipe A, nao administra.
    const manager = await browser.newPage(desktop)
    await step("gestor", "login pelo formulario", () => manager.login("gestor"))
    await visit(manager, "gestor", "/meu-dia", { texts: ["Homolog Negocio Parado"], shot: "gestor-meu-dia" })
    await visit(manager, "gestor", "/dashboard", { texts: ["Sua equipe e negociações sem responsável"], shot: "gestor-dashboard" })
    await visit(manager, "gestor", "/pipeline", { texts: ["Homolog Negocio Proposta"], shot: "gestor-pipeline" })
    await step("gestor", "quadro nao mostra a negociacao da equipe B", async () => {
      if ((await manager.text()).includes("Homolog Negocio Equipe B")) throw new Error("negociacao da equipe B visivel")
    })
    await visit(manager, "gestor", `/pipeline/${data.proposal.id}`, { texts: ["Homolog Negocio Proposta"] })
    await visit(manager, "gestor", `/pipeline/${data.teamBDeal.id}`, { expect: 404 })
    for (const pathname of ["/atividades", "/report", "/report?aba=fechados", "/empresas", "/contatos", "/saleia", "/sdr", "/consultor", "/planos", "/diagnostico"]) {
      await visit(manager, "gestor", pathname)
    }
    for (const pathname of ["/configuracoes", "/configuracoes/usuarios", "/configuracoes/comercial", "/configuracoes/auditoria"]) {
      await visit(manager, "gestor", pathname, { expect: "denied" })
    }

    // ---- Vendedor: so o que e dele.
    const seller = await browser.newPage(desktop)
    await step("vendedor", "login pelo formulario", () => seller.login("vendedor"))
    await visit(seller, "vendedor", "/meu-dia", { texts: ["Homolog Reuniao de proposta"], shot: "vendedor-meu-dia" })
    await visit(seller, "vendedor", "/dashboard", { texts: ["Suas negociações"], shot: "vendedor-dashboard" })
    await visit(seller, "vendedor", "/pipeline", { texts: ["Homolog Negocio Proposta"], shot: "vendedor-pipeline" })
    await visit(seller, "vendedor", `/pipeline/${data.teamBDeal.id}`, { expect: 404 })
    await visit(seller, "vendedor", "/report", { shot: "vendedor-report" })
    await visit(seller, "vendedor", "/report?aba=fechados", { texts: ["Dia fechado na homologacao"] })
    for (const pathname of ["/atividades", "/empresas", `/empresas/${data.alfa.id}`, "/contatos", "/saleia", `/saleia/${id("reuniao")}`, "/planos", "/diagnostico"]) {
      await visit(seller, "vendedor", pathname)
    }
    for (const pathname of ["/sdr", "/consultor", "/configuracoes", "/configuracoes/usuarios", "/configuracoes/comercial"]) {
      await visit(seller, "vendedor", pathname, { expect: "denied" })
    }

    // ---- Celular (390 px), como vendedor: sem rolagem lateral.
    const phone = await browser.newPage({ width: 390, height: 844, mobile: true })
    await step("celular", "login pelo formulario", () => phone.login("vendedor"))
    for (const [pathname, shot] of [
      ["/meu-dia", "celular-meu-dia"],
      ["/dashboard", "celular-dashboard"],
      ["/pipeline", "celular-pipeline"],
      [`/pipeline/${data.proposal.id}`, "celular-negociacao"],
      ["/atividades", "celular-atividades"],
      ["/report", "celular-report"],
      [`/empresas/${data.alfa.id}`, "celular-empresa-360"],
      [`/saleia/${id("reuniao")}`, "celular-saleia-reuniao"],
    ]) {
      await visit(phone, "celular", pathname, { shot })
    }
    const phoneAdmin = await browser.newPage({ width: 390, height: 844, mobile: true })
    await step("celular", "login do administrador", () => phoneAdmin.login("admin"))
    for (const [pathname, shot] of [
      ["/configuracoes/usuarios", "celular-usuarios"],
      ["/configuracoes/comercial", "celular-comercial"],
      ["/configuracoes/auditoria", "celular-auditoria"],
    ]) {
      await visit(phoneAdmin, "celular", pathname, { shot })
    }

    // ---- Paginas publicas, sem sessao.
    const visitor = await browser.newPage(desktop)
    await visit(visitor, "publico", "/login", { texts: ["Esqueci a senha"], shot: "publico-login" })
    await visit(visitor, "publico", "/convite/token-que-nao-existe", { texts: ["Convite não encontrado"], shot: "publico-convite" })
    await visit(visitor, "publico", "/redefinir-senha/token-que-nao-existe", { shot: "publico-nova-senha" })
    await visit(visitor, "publico", `/sdr/${ORG}`, { shot: "publico-widget-sdr" })
    await step("publico", "tela interna sem sessao leva ao login", async () => {
      await visitor.open("/meu-dia")
      await visitor.waitFor(`location.pathname === "/login"`, "redirecionar para o login")
    })
  } finally {
    await browser.close()
  }
}

// ---------------------------------------------------------------- execucao

mkdirSync(OUT, { recursive: true })
await db.connect()
let failed = false
try {
  const data = await seed()
  await run(data)
} catch (error) {
  failed = true
  console.error(`\nRoteiro interrompido: ${error.stack ?? error}`)
} finally {
  if (process.env.HOMOLOG_KEEP !== "1") await cleanup()
  await db.end()
}

const failures = results.filter((result) => !result.ok)
writeFileSync(path.join(OUT, "resultado.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 2))
console.log(`\n${results.length} verificacoes, ${failures.length} com falha. Capturas e resultado.json em ${OUT}`)
process.exit(failed || failures.length > 0 ? 1 : 0)
