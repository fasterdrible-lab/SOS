import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { hasPermission, opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { serializeOpportunity } from "@/lib/opportunities/create"
import { planStageTransition } from "@/lib/opportunities/rules"
import { opportunityStageUpdateSchema } from "@/lib/validations/opportunity"

class StaleStageError extends Error {}

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
  })

  if (!existing) {
    return NextResponse.json(
      { error: "Oportunidade nao encontrada." },
      { status: 404 }
    )
  }

  const transition = planStageTransition({
    from: existing.stage,
    to: parsed.data.stage,
    lostReason: parsed.data.lostReason,
    canReopen: hasPermission(session.user.role, "opportunities:reopen"),
    now: new Date(),
  })

  if (!transition.ok) {
    return NextResponse.json({ error: transition.error }, { status: transition.status })
  }

  if (transition.unchanged) {
    return NextResponse.json({ opportunity: serializeOpportunity(existing) })
  }

  const change = transition.data

  try {
    const opportunity = await prisma.$transaction(async (tx) => {
      // So aplica se a etapa ainda for a que foi lida: duas mudancas simultaneas
      // nao podem gerar historico com origem errada.
      const { count } = await tx.opportunity.updateMany({
        where: { id, organizationId, stage: existing.stage },
        data: change,
      })

      if (count === 0) throw new StaleStageError()

      await tx.opportunityStageHistory.create({
        data: {
          organizationId,
          opportunityId: id,
          fromStage: existing.stage,
          toStage: change.stage,
          changedById: session.user.id,
          lostReason: change.lostReason,
          changedAt: change.stageChangedAt,
        },
      })

      return tx.opportunity.findUniqueOrThrow({ where: { id } })
    })

    return NextResponse.json({ opportunity: serializeOpportunity(opportunity) })
  } catch (error) {
    if (error instanceof StaleStageError) {
      return NextResponse.json(
        { error: "A oportunidade foi alterada por outra pessoa. Atualize a pagina." },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Nao foi possivel atualizar a oportunidade." },
      { status: 500 }
    )
  }
}
