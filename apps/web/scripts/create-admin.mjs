// Cria (ou redefine a senha de) um usuario com login por credenciais.
// O app nao tem pagina de cadastro: em um banco novo, este e o primeiro acesso.
// Uso: DATABASE_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin
import "dotenv/config"
import { randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"
import pg from "pg"

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env

if (!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Defina DATABASE_URL, ADMIN_EMAIL e ADMIN_PASSWORD.")
  process.exit(1)
}

if (ADMIN_PASSWORD.length < 12) {
  console.error("ADMIN_PASSWORD precisa ter pelo menos 12 caracteres.")
  process.exit(1)
}

const client = new pg.Client({ connectionString: DATABASE_URL })
await client.connect()

try {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  await client.query(
    `INSERT INTO users (id, name, email, "passwordHash", "updatedAt")
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (email) DO UPDATE
     SET "passwordHash" = EXCLUDED."passwordHash", "updatedAt" = now()`,
    [randomUUID(), "Admin", ADMIN_EMAIL, passwordHash]
  )

  console.log(`Usuario pronto: ${ADMIN_EMAIL}`)
} finally {
  await client.end()
}
