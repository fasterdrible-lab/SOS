import { NextResponse } from "next/server"

import { apiError, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { recordAudit } from "@/lib/audit/record"
import { prisma } from "@/lib/db"
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/security/crypto"
import { apiIntegrationInputSchema } from "@/lib/validations/api-integration"

export const GET = withApiErrors("GET /api/settings/integrations", async () => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para listar integracoes.")
  }

  const denied = denyUnless(session.user.role, "integrations:manage")
  if (denied) return denied

  const integrations = await prisma.apiIntegration.findMany({
    where: { organizationId },
    orderBy: { provider: "asc" },
  })

  return NextResponse.json({
    integrations: integrations.map((integration) => ({
      provider: integration.provider,
      maskedKey: maskSecret(decryptSecret(integration.apiKeyEncrypted)),
      updatedAt: integration.updatedAt,
    })),
  })
})

export const POST = withApiErrors("POST /api/settings/integrations", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para configurar integracao.")
  }

  const denied = denyUnless(session.user.role, "integrations:manage")
  if (denied) return denied

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const parsed = apiIntegrationInputSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const { provider, apiKey } = parsed.data

  try {
    const integration = await prisma.$transaction(async (tx) => {
      const saved = await tx.apiIntegration.upsert({
        where: { organizationId_provider: { organizationId, provider } },
        create: {
          organizationId,
          provider,
          apiKeyEncrypted: encryptSecret(apiKey),
        },
        update: {
          apiKeyEncrypted: encryptSecret(apiKey),
        },
      })

      await recordAudit(
        {
          organizationId,
          actorUserId: session.user.id,
          action: "integration.saved",
          entityType: "ApiIntegration",
          entityId: saved.id,
          metadata: { provider },
        },
        tx
      )

      return saved
    })

    return NextResponse.json({
      integration: {
        provider: integration.provider,
        maskedKey: maskSecret(apiKey),
        updatedAt: integration.updatedAt,
      },
    })
  } catch (error) {
    logServerError("POST /api/settings/integrations", error)
    return apiError("INTERNAL", "Nao foi possivel salvar a integracao.")
  }
})
