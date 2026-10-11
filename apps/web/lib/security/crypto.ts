import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

function getKey(): Buffer {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY

  if (!secret) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY nao configurada.")
  }

  return crypto.createHash("sha256").update(secret).digest()
}

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv, authTag, encrypted]
    .map((buffer) => buffer.toString("base64"))
    .join(".")
}

export function decryptSecret(payload: string): string {
  const [ivB64, authTagB64, dataB64] = payload.split(".")

  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Payload criptografado invalido.")
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, "base64")
  )
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

export function maskSecret(value: string): string {
  if (value.length <= 8) {
    return "••••••••"
  }

  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}
