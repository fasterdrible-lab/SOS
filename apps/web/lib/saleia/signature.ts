// Assinatura dos eventos do SALE-IA (docs/INTEGRACAO_SALEIA.md). Pura: so usa crypto.
import crypto from "crypto"

/** Diferenca maxima entre o relogio do SALE-IA e o do SOS. */
export const SIGNATURE_TOLERANCE_SECONDS = 300
export const SECRET_PREFIX = "slia_"

const SIGNATURE_PATTERN = /^sha256=([0-9a-f]{64})$/

export function generateSaleiaSecret(): string {
  return `${SECRET_PREFIX}${crypto.randomBytes(32).toString("base64url")}`
}

export function signSaleiaPayload(secret: string, timestamp: string, body: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`
}

export type SignatureCheck = { ok: true } | { ok: false; reason: "missing" | "stale" | "mismatch" }

export function verifySaleiaSignature(input: {
  secret: string
  timestamp: string | null
  signature: string | null
  body: string
  now: Date
}): SignatureCheck {
  const { secret, timestamp, signature, body, now } = input
  if (!timestamp || !signature) return { ok: false, reason: "missing" }

  const seconds = Number(timestamp)
  if (!/^\d{1,12}$/.test(timestamp) || Math.abs(now.getTime() / 1000 - seconds) > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: "stale" }
  }

  const received = SIGNATURE_PATTERN.exec(signature.trim().toLowerCase())?.[1]
  if (!received) return { ok: false, reason: "mismatch" }

  const expected = signSaleiaPayload(secret, timestamp, body).slice("sha256=".length)
  const same = crypto.timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"))
  return same ? { ok: true } : { ok: false, reason: "mismatch" }
}
