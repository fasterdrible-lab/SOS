import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { recordAudit } from "@/lib/audit/record"
import { opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { opportunityStageUpdateSchema } from "@/lib/validations/opportunity"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para atualizar oportunidade." },
      { status: 401 }
    )
  }

  const denied = denyUnless(session.user.role, "opportunities:write")
  if (denied) return denied

  const { id } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const parsed = opportunityStageUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const existing = await prisma.opportunity.findFirst({
    where: {
      id,
      organizationId,
      ...opportunityScope(session.user.role, session.user.id),
    },
    select: { id: true, stage: true },
  })

  if (!existing) {
    return NextResponse.json(
      { error: "Oportunidade nao encontrada." },
      { status: 404 }
    )
  }

  try {
    const opportunity = await prisma.$transaction(async (tx) => {
      const updated = await tx.opportunity.update({
        where: { id },
        data: { stage: parsed.data.stage },
      })

      if (existing.stage !== updated.stage) {
        await recordAudit(
          {
            organizationId,
            actorUserId: session.user.id,
            action: "opportunity.stage-changed",
            entityType: "Opportunity",
            entityId: id,
            metadata: { from: existing.stage, to: updated.stage },
          },
          tx
        )
      }

      return updated
    })

    return NextResponse.json({ opportunity })
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel atualizar a oportunidade." },
      { status: 500 }
    )
  }
}
