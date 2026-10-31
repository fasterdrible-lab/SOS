import { NextResponse } from "next/server"

import { apiError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { recordAudit } from "@/lib/audit/record"
import { auth, unstable_update } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sessionOrganizationInputSchema } from "@/lib/validations/session-organization"

export const POST = withApiErrors("POST /api/session/organization", async (request: Request) => {
  const session = await auth()

  if (!session?.user?.id) {
    return apiError("UNAUTHENTICATED", "Nao autorizado.")
  }

  const body = await request.json().catch(() => null)
  const parsed = sessionOrganizationInputSchema.safeParse(body)

  if (!parsed.success) {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: parsed.data.organizationId,
        userId: session.user.id,
      },
    },
    select: { organizationId: true, role: true },
  })

  if (!member) {
    return apiError("NOT_FOUND", "Voce nao pertence a essa organizacao.")
  }

  await unstable_update({ user: { organizationId: member.organizationId } })

  if (session.user.organizationId !== member.organizationId) {
    await recordAudit({
      organizationId: member.organizationId,
      actorUserId: session.user.id,
      action: "session.organization-switched",
      entityType: "Organization",
      entityId: member.organizationId,
    })
  }

  return NextResponse.json({ organizationId: member.organizationId, role: member.role })
})
