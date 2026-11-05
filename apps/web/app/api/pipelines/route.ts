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

export const GET = withApiErrors("GET /api/pipelines", async () => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para ver os funis.")
  }

  const denied = denyUnless(session.user.role, "opportunities:read")
  if (denied) return denied

  return NextResponse.json({ pipelines: await getPipelines(organizationId) })
})

export const POST = withApiErrors("POST /api/pipelines", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para criar funil.")
  }

  const denied = denyUnless(session.user.role, "pipelines:manage")
  if (denied) return denied

  const parsed = pipelineInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  if (parsed.data.stages.some((stage) => stage.id)) {
    return apiError("BAD_REQUEST", "Um funil novo nao tem etapas existentes.")
  }

  const plan = planStageEdits([], parsed.data.stages)
  if (!plan.ok) return apiError(codeForStatus(plan.status), plan.error)

  const pipeline = await prisma.$transaction(async (tx) => {
    const position = await tx.pipeline.count({ where: { organizationId } })
    const created = await tx.pipeline.create({
      data: {
        organizationId,
        name: parsed.data.name,
        position,
        stages: {
          create: plan.upserts.map((stage) => ({
            organizationId,
            name: stage.name,
            position: stage.position,
            probability: stage.probability,
            isProposal: stage.isProposal,
            requiredFields: stage.requiredFields ?? [],
          })),
        },
      },
      select: { id: true },
    })

    await recordAudit(
      {
        organizationId,
        actorUserId: session.user.id,
        action: "pipeline.created",
        entityType: "Pipeline",
        entityId: created.id,
        metadata: { stages: plan.upserts.length },
      },
      tx
    )

    return created
  })

  const pipelines = await getPipelines(organizationId)
  return NextResponse.json(
    { pipeline: pipelines.find((item) => item.id === pipeline.id) },
    { status: 201 }
  )
})
