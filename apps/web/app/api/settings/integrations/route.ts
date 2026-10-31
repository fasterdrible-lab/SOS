import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { recordAudit } from "@/lib/audit/record"
import { prisma } from "@/lib/db"
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/security/crypto"
import { apiIntegrationInputSchema } from "@/lib/validations/api-integration"

export async function GET() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para listar integracoes." },
      { status: 401 }
    )
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
}

export async function POST(request: Request) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para configurar integracao." },
      { status: 401 }
    )
  }

  const denied = denyUnless(session.user.role, "integrations:manage")
  if (denied) return denied

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const parsed = apiIntegrationInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
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
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel salvar a integracao." },
      { status: 500 }
    )
  }
}
