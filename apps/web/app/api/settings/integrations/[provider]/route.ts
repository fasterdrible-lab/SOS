import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { recordAudit } from "@/lib/audit/record"
import { prisma } from "@/lib/db"
import { apiIntegrationDeleteSchema } from "@/lib/validations/api-integration"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para remover integracao." },
      { status: 401 }
    )
  }

  const denied = denyUnless(session.user.role, "integrations:manage")
  if (denied) return denied

  const { provider: rawProvider } = await params
  const parsed = apiIntegrationDeleteSchema.safeParse({ provider: rawProvider })

  if (!parsed.success) {
    return NextResponse.json({ error: "Provedor invalido." }, { status: 400 })
  }

  const existing = await prisma.apiIntegration.findUnique({
    where: {
      organizationId_provider: {
        organizationId,
        provider: parsed.data.provider,
      },
    },
    select: { id: true },
  })

  if (!existing) {
    return NextResponse.json(
      { error: "Integracao nao encontrada." },
      { status: 404 }
    )
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.apiIntegration.delete({ where: { id: existing.id } })

      await recordAudit(
        {
          organizationId,
          actorUserId: session.user.id,
          action: "integration.removed",
          entityType: "ApiIntegration",
          entityId: existing.id,
          metadata: { provider: parsed.data.provider },
        },
        tx
      )
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel remover a integracao." },
      { status: 500 }
    )
  }
}
