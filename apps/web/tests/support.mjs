// Apoio aos testes de integracao: cliente HTTP com cookies e travas de ambiente.
import assert from "node:assert/strict"
import { existsSync } from "node:fs"

import pg from "pg"

// No CI as variaveis vem do ambiente.
if (existsSync(".env")) process.loadEnvFile(".env")

export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100"
export const PASSWORD = "senha-de-teste-integracao-123"

const LOCAL_HOSTS = ["localhost", "127.0.0.1"]

assert.ok(
  LOCAL_HOSTS.includes(new URL(process.env.DATABASE_URL).hostname) &&
    LOCAL_HOSTS.includes(new URL(BASE_URL).hostname),
  "Os testes de integracao so rodam em ambiente local."
)

export function createDb() {
  return new pg.Client({ connectionString: process.env.DATABASE_URL })
}

// Funil padrao (V2-4.1), com os ids deterministicos de lib/pipelines/defaults.ts.
// Os testes descrevem a negociacao pelo nome antigo da etapa ("PROPOSAL",
// "CLOSED_WON"); estes ajudantes traduzem para funil, etapa e status.
const LEGACY_POSITIONS = { PROSPECTING: 1, QUALIFICATION: 2, PROPOSAL: 3, NEGOTIATION: 4 }
const LEGACY_NAMES = Object.fromEntries(Object.entries(LEGACY_POSITIONS).map(([name, position]) => [position, name]))
const DEFAULT_STAGES = [
  [1, "Prospecção", 10, false],
  [2, "Qualificação", 25, false],
  [3, "Proposta", 50, true],
  [4, "Negociação", 75, false],
]

export const pipelineIdOf = (organizationId) => `pipe_${organizationId}`
/** Etapa do funil padrao; ganha e perdida ficam em Negociacao. */
export const stageIdOf = (organizationId, legacy) =>
  `stg_${organizationId}_${LEGACY_POSITIONS[legacy] ?? 4}`
export const statusOf = (legacy) =>
  legacy === "CLOSED_WON" ? "WON" : legacy === "CLOSED_LOST" ? "LOST" : "OPEN"

/** Colunas pipelineId, stageId e status, nessa ordem, para um insert. */
export const legacyColumns = (organizationId, legacy) => [
  pipelineIdOf(organizationId),
  stageIdOf(organizationId, legacy),
  statusOf(legacy),
]

/** Nome antigo a partir de etapa e status gravados. */
export function legacyName(stageId, status) {
  if (stageId === null || stageId === undefined) return null
  if (status === "WON") return "CLOSED_WON"
  if (status === "LOST") return "CLOSED_LOST"
  return LEGACY_NAMES[Number(stageId.split("_").at(-1))]
}

/** Corpo do PATCH de /api/opportunities/[id] que leva a etapa antiga. */
export function changeTo(organizationId, legacy, lostReason) {
  const status = statusOf(legacy)
  return status === "OPEN"
    ? { stageId: stageIdOf(organizationId, legacy), status }
    : { status, lostReason }
}

/** Cria o funil padrao de organizacoes inseridas por SQL. */
export async function ensurePipelines(db, organizationIds) {
  for (const organizationId of organizationIds) {
    await db.query(
      `insert into pipelines (id, "organizationId", name, "isDefault", "updatedAt")
       values ($1, $2, 'Vendas', true, now()) on conflict (id) do nothing`,
      [pipelineIdOf(organizationId), organizationId]
    )
    for (const [position, name, probability, isProposal] of DEFAULT_STAGES) {
      await db.query(
        `insert into pipeline_stages (id, "organizationId", "pipelineId", name, position, probability, "isProposal", "updatedAt")
         values ($1, $2, $3, $4, $5, $6, $7, now()) on conflict (id) do nothing`,
        [`stg_${organizationId}_${position}`, organizationId, pipelineIdOf(organizationId), name, position, probability, isProposal]
      )
    }
  }
}

export class Client {
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

  async login(email) {
    const csrf = await (await this.request("/api/auth/csrf")).json()
    await this.request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken,
        email,
        password: PASSWORD,
        callbackUrl: BASE_URL,
      }),
    })
    const session = await this.session()
    assert.equal(session?.user?.email, email, `login de ${email} falhou`)
    return this
  }

  async session() {
    return (await this.request("/api/auth/session")).json()
  }
}
