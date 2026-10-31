import { NextResponse } from "next/server"

import { apiError, codeForStatus, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { hasPermission, opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { serializeOpportunity } from "@/lib/opportunities/create"
import { planStageTransition } from "@/lib/opportunities/rules"
import { opportunityStageUpdateSchema } from "@/lib/validations/opportunity"

class StaleStageError extends Error {}

export const PATCH = withApiErrors("PATCH /api/opportunities/[id]", async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para atualizar oportunidade.")
  }

  const denied = denyUnless(session.user.role, "opportunities:write")
  if (denied) return denied

  const { id } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const parsed = opportunityStageUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const existing = await prisma.opportunity.findFirst({
    where: {
      id,
      organizationId,
      ...opportunityScope(session.user.role, session.user.id),
    },
  })

  if (!existing) {
    return apiError("NOT_FOUND", "Oportunidade nao encontrada.")
  }

  const transition = planStageTransition({
    from: existing.stage,
    to: parsed.data.stage,
    lostReason: parsed.data.lostReason,
    canReopen: hasPermission(session.user.role, "opportunities:reopen"),
    now: new Date(),
  })

  if (!transition.ok) {
    return apiError(codeForStatus(transition.status), transition.error)
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
      return apiError("CONFLICT", "A oportunidade foi alterada por outra pessoa. Atualize a pagina.")
    }

    logServerError("PATCH /api/opportunities/[id]", error)
    return apiError("INTERNAL", "Nao foi possivel atualizar a oportunidade.")
  }
})
