import assert from "node:assert/strict"
import { describe, it, mock } from "node:test"

import { z } from "zod"

import {
  apiError,
  codeForStatus,
  describeError,
  logServerError,
  validationError,
} from "../lib/api/errors.ts"

describe("respostas de erro", () => {
  it("usam status e corpo padronizados", async () => {
    const response = apiError("FORBIDDEN", "Sem permissao.")
    assert.equal(response.status, 403)
    assert.deepEqual(await response.json(), { error: "Sem permissao.", code: "FORBIDDEN" })
  })

  it("trazem os campos invalidos na validacao", async () => {
    const parsed = z.object({ title: z.string().min(2) }).safeParse({ title: "" })
    const response = validationError(parsed.error)
    assert.equal(response.status, 400)
    const body = await response.json()
    assert.equal(body.code, "BAD_REQUEST")
    assert.equal(body.error, "Dados invalidos.")
    assert.ok(body.fields.title.length > 0)
  })

  it("convertem status em codigo, com INTERNAL para desconhecidos", () => {
    assert.equal(codeForStatus(422), "UNPROCESSABLE")
    assert.equal(codeForStatus(403), "FORBIDDEN")
    assert.equal(codeForStatus(418), "INTERNAL")
  })
})

describe("logs seguros", () => {
  it("removem chaves, tokens, e-mails e URLs com credencial", () => {
    const error = new Error(
      "falhou com sk-ant-api03-abcdefghijklmnop gsk_abcdefghijklmnop " +
        "Bearer eyJhbGciOi.abc.def para cliente@empresa.com.br em postgresql://u:senha@db:5432/x"
    )
    const { message } = describeError(error)
    for (const secret of ["sk-ant-api03", "gsk_abc", "eyJhbGciOi", "cliente@empresa", "senha@db"]) {
      assert.ok(!message.includes(secret), `${secret} vazou: ${message}`)
    }
  })

  it("nao registram a mensagem de erros do Prisma, que pode conter dados", () => {
    const error = new Error("Invalid invocation: { email: 'pessoa@exemplo.com' }")
    error.name = "PrismaClientValidationError"
    assert.deepEqual(describeError(error), { name: "PrismaClientValidationError" })

    const known = Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    known.name = "PrismaClientKnownRequestError"
    assert.deepEqual(describeError(known), { name: "PrismaClientKnownRequestError", code: "P2002" })
  })

  it("limitam o tamanho e aceitam valores que nao sao Error", () => {
    assert.equal(describeError(new Error("x".repeat(1000))).message.length, 300)
    assert.deepEqual(describeError("texto"), { name: "string" })
  })

  it("escrevem uma linha JSON com escopo", (t) => {
    const spy = t.mock.method(console, "error", () => {})
    logServerError("POST /api/teste", new TypeError("quebrou para a@b.com"))
    assert.equal(spy.mock.callCount(), 1)
    const entry = JSON.parse(spy.mock.calls[0].arguments[0])
    assert.equal(entry.scope, "POST /api/teste")
    assert.equal(entry.name, "TypeError")
    assert.equal(entry.message, "quebrou para [email]")
    mock.restoreAll()
  })
})
