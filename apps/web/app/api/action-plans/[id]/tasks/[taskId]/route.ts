import { NextResponse } from "next/server"

import { apiError, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { prisma } from "@/lib/db"
import { actionTaskStatusUpdateSchema } from "@/lib/validations/action-task"

export const PATCH = withApiErrors("PATCH /api/action-plans/[id]/tasks/[taskId]", async (
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para atualizar tarefa.")
  }

  const denied = denyUnless(session.user.role, "action-tasks:update-status")
  if (denied) return denied

  const { id, taskId } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const parsed = actionTaskStatusUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const existing = await prisma.actionTask.findFirst({
    where: { id: taskId, actionPlanId: id, actionPlan: { organizationId } },
    select: { id: true },
  })

  if (!existing) {
    return apiError("NOT_FOUND", "Tarefa nao encontrada.")
  }

  try {
    const task = await prisma.actionTask.update({
      where: { id: taskId },
      data: { status: parsed.data.status },
    })

    return NextResponse.json({ task })
  } catch (error) {
    logServerError("PATCH /api/action-plans/[id]/tasks/[taskId]", error)
    return apiError("INTERNAL", "Nao foi possivel atualizar a tarefa.")
  }
})
