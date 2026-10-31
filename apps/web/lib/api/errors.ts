import type { ZodError } from "zod"

const STATUS_BY_CODE = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UPSTREAM_FAILED: 502,
} as const

export type ApiErrorCode = keyof typeof STATUS_BY_CODE

/** Formato unico de erro da API. Os componentes leem `error`. */
export interface ApiErrorBody {
  error: string
  code: ApiErrorCode
  fields?: Record<string, string[] | undefined>
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  fields?: ApiErrorBody["fields"]
): Response {
  const body: ApiErrorBody = fields ? { error: message, code, fields } : { error: message, code }
  return Response.json(body, { status: STATUS_BY_CODE[code] })
}

export function codeForStatus(status: number): ApiErrorCode {
  const entry = Object.entries(STATUS_BY_CODE).find(([, value]) => value === status)
  return (entry?.[0] as ApiErrorCode | undefined) ?? "INTERNAL"
}

export function validationError(error: ZodError): Response {
  return apiError("BAD_REQUEST", "Dados invalidos.", error.flatten().fieldErrors)
}

const REDACTIONS: [RegExp, string][] = [
  [/\b(sk|gsk|pk|rk)[-_][A-Za-z0-9_-]{8,}/g, "[chave]"],
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [token]"],
  [/[a-z][a-z0-9+.-]*:\/\/[^\s/@]+@[^\s]+/gi, "[url com credencial]"],
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]"],
]

const MAX_MESSAGE_LENGTH = 300

/**
 * Resumo de um erro seguro para log. Erros do Prisma podem repetir no texto os
 * dados da consulta, por isso deles so saem o tipo e o codigo.
 */
export function describeError(error: unknown): { name: string; code?: string; message?: string } {
  if (!(error instanceof Error)) return { name: typeof error }

  const code = (error as { code?: unknown }).code
  const summary = {
    name: error.name,
    ...(typeof code === "string" ? { code } : {}),
  }

  if (error.name.startsWith("PrismaClient")) return summary

  let message = error.message
  for (const [pattern, replacement] of REDACTIONS) message = message.replace(pattern, replacement)

  return { ...summary, message: message.slice(0, MAX_MESSAGE_LENGTH) }
}

export function logServerError(scope: string, error: unknown): void {
  console.error(
    JSON.stringify({
      level: "error",
      scope,
      at: new Date().toISOString(),
      ...describeError(error),
    })
  )
}
