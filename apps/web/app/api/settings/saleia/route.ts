import { NextResponse } from "next/server"

import { apiError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { recordAudit } from "@/lib/audit/record"
import { prisma } from "@/lib/db"
import { generateSaleiaSecret } from "@/lib/saleia/signature"
import { encryptSecret } from "@/lib/security/crypto"

async function adminSession(): Promise<{ error: Response } | { organizationId: string; userId: string }> {
  const session = await auth()
  const organizationId = session?.user?.organizationId
  if (!session?.user?.id || !organizationId) {
    return { error: apiError("UNAUTHENTICATED", "Usuario sem permissao para configurar o SALEIA.") }
  }
  const denied = denyUnless(session.user.role, "integrations:manage")
  if (denied) return { error: denied }
  return { organizationId, userId: session.user.id }
}

/** Situacao da conexao; o segredo nunca volta depois de gerado. */
export const GET = withApiErrors("GET /api/settings/saleia", async () => {
  const ctx = await adminSession()
  if ("error" in ctx) return ctx.error

  const integration = await prisma.saleiaIntegration.findUnique({
    where: { organizationId: ctx.organizationId },
    select: { secretHint: true, lastEventAt: true, updatedAt: true },
  })

  return NextResponse.json({
    connected: Boolean(integration),
    secretHint: integration?.secretHint ?? null,
    lastEventAt: integration?.lastEventAt ?? null,
    updatedAt: integration?.updatedAt ?? null,
    endpoint: `/api/integrations/saleia/${ctx.organizationId}/events`,
  })
})

/** Conecta ou gera um novo segredo. O anterior deixa de valer na hora. */
export const POST = withApiErrors("POST /api/settings/saleia", async () => {
  const ctx = await adminSession()
  if ("error" in ctx) return ctx.error

  const secret = generateSaleiaSecret()
  const secretHint = secret.slice(-4)

  const existing = await prisma.$transaction(async (tx) => {
    const previous = await tx.saleiaIntegration.findUnique({
      where: { organizationId: ctx.organizationId },
      select: { id: true },
    })
    const saved = await tx.saleiaIntegration.upsert({
      where: { organizationId: ctx.organizationId },
      create: { organizationId: ctx.organizationId, secretEncrypted: encryptSecret(secret), secretHint },
      update: { secretEncrypted: encryptSecret(secret), secretHint },
    })
    await recordAudit(
      {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: previous ? "saleia.secret-rotated" : "saleia.connected",
        entityType: "SaleiaIntegration",
        entityId: saved.id,
      },
      tx
    )
    return Boolean(previous)
  })

  return NextResponse.json(
    {
      secret,
      secretHint,
      endpoint: `/api/integrations/saleia/${ctx.organizationId}/events`,
    },
    { status: existing ? 200 : 201 }
  )
})

/** Desconecta: eventos passam a ser recusados; as reunioes recebidas ficam. */
export const DELETE = withApiErrors("DELETE /api/settings/saleia", async () => {
  const ctx = await adminSession()
  if ("error" in ctx) return ctx.error

  const removed = await prisma.$transaction(async (tx) => {
    const integration = await tx.saleiaIntegration.findUnique({
      where: { organizationId: ctx.organizationId },
      select: { id: true },
    })
    if (!integration) return false
    await tx.saleiaIntegration.delete({ where: { id: integration.id } })
    await recordAudit(
      {
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: "saleia.disconnected",
        entityType: "SaleiaIntegration",
        entityId: integration.id,
      },
      tx
    )
    return true
  })

  if (!removed) return apiError("NOT_FOUND", "O SALEIA nao esta conectado.")
  return NextResponse.json({ removed: true })
})
