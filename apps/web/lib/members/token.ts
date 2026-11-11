import { createHash, randomBytes } from "node:crypto"

/** Token do link de convite: 256 bits, so aparece uma vez para quem convida. */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url")
}

/** O banco guarda so o hash: um vazamento da tabela nao abre convites. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function isInviteTokenShape(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}
