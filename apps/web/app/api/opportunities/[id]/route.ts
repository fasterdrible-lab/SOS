import { NextResponse } from "next/server"

import { apiError, codeForStatus, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { hasPermission, opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { serializeOpportunity } from "@/lib/opportunities/create"
import { planOpportunityChange } from "@/lib/opportunities/rules"
import { findStage } from "@/lib/pipelines/service"
import { opportunityChangeSchema } from "@/lib/validations/opportunity"

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

  const parsed = opportunityChangeSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const existing = await prisma.opportunity.findFirst({
    where: {
      id,
      organizationId,
      ...opportunityScope(session.user.role, session.user.id),
    },
    include: { stage: { select: { id: true, pipelineId: true, probability: true, archivedAt: true } } },
  })

  if (!existing) {
    return apiError("NOT_FOUND", "Oportunidade nao encontrada.")
  }

  const targetStage = parsed.data.stageId
    ? await findStage(prisma, organizationId, parsed.data.stageId)
    : undefined

  if (parsed.data.stageId && !targetStage) {
    return apiError("BAD_REQUEST", "Etapa invalida.")
  }

  const { stage: currentStage, ...current } = existing

  const transition = planOpportunityChange({
    current: {
      status: current.status,
      stage: {
        id: currentStage.id,
        pipelineId: currentStage.pipelineId,
        probability: currentStage.probability,
        archived: currentStage.archivedAt !== null,
      },
    },
    targetStage,
    targetStatus: parsed.data.status,
    lostReason: parsed.data.lostReason,
    canReopen: hasPermission(session.user.role, "opportunities:reopen"),
    now: new Date(),
  })

  if (!transition.ok) {
    return apiError(codeForStatus(transition.status), transition.error)
  }

  if (transition.unchanged) {
    return NextResponse.json({ opportunity: serializeOpportunity(current) })
  }

  const change = transition.data

  try {
    const opportunity = await prisma.$transaction(async (tx) => {
      // So aplica se etapa e status ainda forem os lidos: duas mudancas simultaneas
      // nao podem gerar historico com origem errada.
      const { count } = await tx.opportunity.updateMany({
        where: { id, organizationId, stageId: existing.stageId, status: existing.status },
        data: change,
      })

      if (count === 0) throw new StaleStageError()

      await tx.opportunityStageHistory.create({
        data: {
          organizationId,
          opportunityId: id,
          fromStageId: existing.stageId,
          fromStatus: existing.status,
          toStageId: change.stageId,
          toStatus: change.status,
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
