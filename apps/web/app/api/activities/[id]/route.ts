import { NextResponse } from "next/server"

import { requiresDueDate } from "@/lib/activities/rules"
import { activityScope, checkActivityLinks } from "@/lib/activities/service"
import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { hasPermission } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { activityUpdateSchema } from "@/lib/validations/activity"

type Context = { params: Promise<{ id: string }> }

/** Edita, conclui (`completed: true`) ou reabre (`completed: false`). */
export const PATCH = withApiErrors("PATCH /api/activities/[id]", async (request: Request, { params }: Context) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para editar atividade.")
  }

  const denied = denyUnless(session.user.role, "activities:write")
  if (denied) return denied

  const parsed = activityUpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const { id } = await params
  const existing = await prisma.activity.findFirst({
    where: { id, organizationId, ...activityScope(session.user.role, session.user.id) },
  })
  if (!existing) return apiError("NOT_FOUND", "Atividade nao encontrada.")

  const { completed, dueDate, companyId, contactId, opportunityId, ownerId, ...rest } = parsed.data

  const nextDue = dueDate === undefined ? existing.dueDate : dueDate === null ? null : new Date(dueDate)
  if (requiresDueDate(rest.type ?? existing.type) && !nextDue) {
    return apiError("UNPROCESSABLE", "Informe a data da atividade.")
  }

  if (ownerId !== undefined && ownerId !== existing.ownerId) {
    if (!hasPermission(session.user.role, "activities:assign")) {
      return apiError("FORBIDDEN", "Somente gestor ou administrador pode atribuir a outra pessoa.")
    }
    if (ownerId) {
      const member = await prisma.organizationMember.findFirst({
        where: { organizationId, userId: ownerId },
        select: { id: true },
      })
      if (!member) return apiError("BAD_REQUEST", "Responsavel invalido.")
    }
  }

  const linksChanged = companyId !== undefined || contactId !== undefined || opportunityId !== undefined
  const links = linksChanged
    ? await checkActivityLinks({
        organizationId,
        userId: session.user.id,
        role: session.user.role,
        companyId: companyId === undefined ? existing.companyId : companyId,
        contactId: contactId === undefined ? existing.contactId : contactId,
        opportunityId: opportunityId === undefined ? existing.opportunityId : opportunityId,
      })
    : null
  if (links && !links.ok) return apiError("BAD_REQUEST", links.error)

  const activity = await prisma.activity.update({
    where: { id },
    data: {
      ...rest,
      dueDate: nextDue,
      ...(ownerId !== undefined ? { ownerId } : {}),
      ...(completed === undefined ? {} : { completedAt: completed ? (existing.completedAt ?? new Date()) : null }),
      ...(links
        ? { companyId: links.companyId, contactId: links.contactId, opportunityId: links.opportunityId }
        : {}),
    },
  })

  return NextResponse.json({ activity })
})

export const DELETE = withApiErrors("DELETE /api/activities/[id]", async (_request: Request, { params }: Context) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para remover atividade.")
  }

  const denied = denyUnless(session.user.role, "activities:write")
  if (denied) return denied

  const { id } = await params
  const { count } = await prisma.activity.deleteMany({
    where: { id, organizationId, ...activityScope(session.user.role, session.user.id) },
  })
  if (count === 0) return apiError("NOT_FOUND", "Atividade nao encontrada.")

  return NextResponse.json({ removed: true })
})
