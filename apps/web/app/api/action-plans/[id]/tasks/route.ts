import { NextResponse } from "next/server"

import { apiError, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { prisma } from "@/lib/db"
import { actionTaskInputSchema } from "@/lib/validations/action-task"

export const GET = withApiErrors("GET /api/action-plans/[id]/tasks", async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para listar tarefas.")
  }

  const denied = denyUnless(session.user.role, "action-plans:read")
  if (denied) return denied

  const { id } = await params

  const actionPlan = await prisma.actionPlan.findFirst({
    where: { id, organizationId },
    select: { id: true },
  })

  if (!actionPlan) {
    return apiError("NOT_FOUND", "Plano de acao nao encontrado.")
  }

  const tasks = await prisma.actionTask.findMany({
    where: { actionPlanId: id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ tasks })
})

export const POST = withApiErrors("POST /api/action-plans/[id]/tasks", async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para criar tarefa.")
  }

  const denied = denyUnless(session.user.role, "action-plans:write")
  if (denied) return denied

  const { id } = await params

  const actionPlan = await prisma.actionPlan.findFirst({
    where: { id, organizationId },
    select: { id: true },
  })

  if (!actionPlan) {
    return apiError("NOT_FOUND", "Plano de acao nao encontrado.")
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const parsed = actionTaskInputSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const { dueDate, ...rest } = parsed.data

  try {
    const task = await prisma.actionTask.create({
      data: {
        actionPlanId: id,
        dueDate: dueDate ? new Date(dueDate) : null,
        ...rest,
      },
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    logServerError("POST /api/action-plans/[id]/tasks", error)
    return apiError("INTERNAL", "Nao foi possivel salvar a tarefa.")
  }
})
