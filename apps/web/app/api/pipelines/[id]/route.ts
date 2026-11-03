import { NextResponse } from "next/server"

import { apiError, codeForStatus, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { recordAudit } from "@/lib/audit/record"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { prisma } from "@/lib/db"
import { planStageEdits } from "@/lib/pipelines/edit"
import { getPipelines } from "@/lib/pipelines/service"
import { pipelineInputSchema } from "@/lib/validations/pipeline"

type Context = { params: Promise<{ id: string }> }

async function loadManagedPipeline(organizationId: string, id: string) {
  return prisma.pipeline.findFirst({
    where: { id, organizationId, archivedAt: null },
    select: {
      id: true,
      isDefault: true,
      stages: {
        where: { archivedAt: null },
        select: {
          id: true,
          _count: { select: { opportunities: { where: { status: "OPEN" } } } },
        },
      },
    },
  })
}

/** Renomeia o funil e substitui a lista de etapas (ordem, nomes, probabilidades). */
export const PUT = withApiErrors("PUT /api/pipelines/[id]", async (request: Request, { params }: Context) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para editar funil.")
  }

  const denied = denyUnless(session.user.role, "pipelines:manage")
  if (denied) return denied

  const parsed = pipelineInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const { id } = await params
  const pipeline = await loadManagedPipeline(organizationId, id)
  if (!pipeline) return apiError("NOT_FOUND", "Funil nao encontrado.")

  const plan = planStageEdits(
    pipeline.stages.map((stage) => ({ id: stage.id, openCount: stage._count.opportunities })),
    parsed.data.stages
  )
  if (!plan.ok) return apiError(codeForStatus(plan.status), plan.error)

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.pipeline.update({ where: { id }, data: { name: parsed.data.name } })

    if (plan.archive.length > 0) {
      await tx.pipelineStage.updateMany({
        where: { id: { in: plan.archive }, pipelineId: id },
        data: { archivedAt: now },
      })
    }

    for (const stage of plan.upserts) {
      const data = {
        name: stage.name,
        position: stage.position,
        probability: stage.probability,
        isProposal: stage.isProposal,
      }
      if (stage.id) {
        await tx.pipelineStage.update({ where: { id: stage.id }, data })
      } else {
        await tx.pipelineStage.create({ data: { ...data, organizationId, pipelineId: id } })
      }
    }

    // A probabilidade das negociacoes em andamento acompanha a etapa.
    for (const stage of plan.upserts.filter((item) => item.id)) {
      await tx.opportunity.updateMany({
        where: { stageId: stage.id, status: "OPEN" },
        data: { probability: stage.probability },
      })
    }

    await recordAudit(
      {
        organizationId,
        actorUserId: session.user.id,
        action: "pipeline.updated",
        entityType: "Pipeline",
        entityId: id,
        metadata: {
          stages: plan.upserts.length,
          created: plan.upserts.filter((stage) => !stage.id).length,
          archived: plan.archive.length,
        },
      },
      tx
    )
  })

  const pipelines = await getPipelines(organizationId)
  return NextResponse.json({ pipeline: pipelines.find((item) => item.id === id) })
})

/** Arquiva o funil. O padrao nao sai; negociacoes em andamento precisam ser movidas antes. */
export const DELETE = withApiErrors("DELETE /api/pipelines/[id]", async (_request: Request, { params }: Context) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para remover funil.")
  }

  const denied = denyUnless(session.user.role, "pipelines:manage")
  if (denied) return denied

  const { id } = await params
  const pipeline = await loadManagedPipeline(organizationId, id)
  if (!pipeline) return apiError("NOT_FOUND", "Funil nao encontrado.")

  if (pipeline.isDefault) {
    return apiError("CONFLICT", "O funil padrao nao pode ser removido.")
  }
  if (pipeline.stages.some((stage) => stage._count.opportunities > 0)) {
    return apiError("CONFLICT", "Mova as negociacoes em andamento antes de remover o funil.")
  }

  await prisma.$transaction(async (tx) => {
    await tx.pipeline.update({ where: { id }, data: { archivedAt: new Date() } })
    await recordAudit(
      {
        organizationId,
        actorUserId: session.user.id,
        action: "pipeline.archived",
        entityType: "Pipeline",
        entityId: id,
      },
      tx
    )
  })

  return NextResponse.json({ archived: true })
})
