import { NextResponse } from "next/server"

import { apiError, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { prisma } from "@/lib/db"
import { actionPlanInputSchema } from "@/lib/validations/action-plan"

export const GET = withApiErrors("GET /api/action-plans", async () => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para listar planos de acao.")
  }

  const denied = denyUnless(session.user.role, "action-plans:read")
  if (denied) return denied

  const actionPlans = await prisma.actionPlan.findMany({
    where: { organizationId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ actionPlans })
})

export const POST = withApiErrors("POST /api/action-plans", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para criar plano de acao.")
  }

  const denied = denyUnless(session.user.role, "action-plans:write")
  if (denied) return denied

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const parsed = actionPlanInputSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  try {
    const actionPlan = await prisma.actionPlan.create({
      data: {
        organizationId,
        ...parsed.data,
      },
    })

    return NextResponse.json({ actionPlan }, { status: 201 })
  } catch (error) {
    logServerError("POST /api/action-plans", error)
    return apiError("INTERNAL", "Nao foi possivel salvar o plano de acao.")
  }
})
