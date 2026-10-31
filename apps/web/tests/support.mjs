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
