import { NextResponse } from "next/server"

import { apiError, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { recordAudit } from "@/lib/audit/record"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { prisma } from "@/lib/db"
import { ORGANIZATION_GOAL_SCOPE, goalInputSchema } from "@/lib/validations/goal"

export const PUT = withApiErrors("PUT /api/goals", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para definir metas.")
  }

  const denied = denyUnless(session.user.role, "goals:manage")
  if (denied) return denied

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const parsed = goalInputSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const { month, amount } = parsed.data
  const userId = parsed.data.userId ?? null

  if (userId) {
    const member = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { id: true },
    })

    if (!member) {
      return apiError("NOT_FOUND", "Vendedor nao encontrado nesta organizacao.")
    }
  }

  const scopeKey = userId ?? ORGANIZATION_GOAL_SCOPE
  const where = { organizationId_month_scopeKey: { organizationId, month, scopeKey } }
  const auditBase = {
    organizationId,
    actorUserId: session.user.id,
    entityType: "SalesGoal",
    metadata: { month, scope: userId ? "USER" : "ORG", userId },
  }

  try {
    const goal = await prisma.$transaction(async (tx) => {
      if (amount === null) {
        const existing = await tx.salesGoal.findUnique({ where, select: { id: true } })
        if (!existing) return null

        await tx.salesGoal.delete({ where })
        await recordAudit({ ...auditBase, action: "goal.removed", entityId: existing.id }, tx)
        return null
      }

      const saved = await tx.salesGoal.upsert({
        where,
        create: {
          organizationId,
          userId,
          scopeKey,
          month,
          amount,
          updatedById: session.user.id,
        },
        update: { amount, updatedById: session.user.id },
      })

      await recordAudit(
        {
          ...auditBase,
          action: "goal.saved",
          entityId: saved.id,
          metadata: { ...auditBase.metadata, amount },
        },
        tx
      )
      return saved
    })

    return NextResponse.json({
      goal: goal ? { month, userId, amount: Number(goal.amount) } : null,
    })
  } catch (error) {
    logServerError("PUT /api/goals", error)
    return apiError("INTERNAL", "Nao foi possivel salvar a meta.")
  }
})
