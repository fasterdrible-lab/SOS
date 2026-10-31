import { NextResponse } from "next/server"

import { apiError, logServerError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { recordAudit } from "@/lib/audit/record"
import { prisma } from "@/lib/db"
import { apiIntegrationDeleteSchema } from "@/lib/validations/api-integration"

export const DELETE = withApiErrors("DELETE /api/settings/integrations/[provider]", async (
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para remover integracao.")
  }

  const denied = denyUnless(session.user.role, "integrations:manage")
  if (denied) return denied

  const { provider: rawProvider } = await params
  const parsed = apiIntegrationDeleteSchema.safeParse({ provider: rawProvider })

  if (!parsed.success) {
    return apiError("BAD_REQUEST", "Provedor invalido.")
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
    return apiError("NOT_FOUND", "Integracao nao encontrada.")
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
  } catch (error) {
    logServerError("DELETE /api/settings/integrations/[provider]", error)
    return apiError("INTERNAL", "Nao foi possivel remover a integracao.")
  }
})
