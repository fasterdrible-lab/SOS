import { NextResponse } from "next/server"

import { completesOnCreate, parseActivityFilters, requiresDueDate } from "@/lib/activities/rules"
import { checkActivityLinks, listActivities } from "@/lib/activities/service"
import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { getAccessLevel, hasPermission } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { ownerWhere } from "@/lib/opportunities/board"
import { activityInputSchema } from "@/lib/validations/activity"

export const GET = withApiErrors("GET /api/activities", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para ver atividades.")
  }

  const denied = denyUnless(session.user.role, "activities:read")
  if (denied) return denied

  const params = Object.fromEntries(new URL(request.url).searchParams)
  const filters = parseActivityFilters(params)
  const isSeller = getAccessLevel(session.user.role) === "SELLER"

  const activities = await listActivities({
    organizationId,
    userId: session.user.id,
    role: session.user.role,
    where: {
      completedAt: filters.status === "concluidas" ? { not: null } : null,
      ...(filters.type ? { type: filters.type } : {}),
      ...(isSeller ? {} : ownerWhere(filters.owner, session.user.id)),
    },
    orderBy: filters.status === "concluidas" ? [{ completedAt: "desc" }] : undefined,
    take: 500,
  })

  return NextResponse.json({ activities })
})

export const POST = withApiErrors("POST /api/activities", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para criar atividade.")
  }

  const denied = denyUnless(session.user.role, "activities:write")
  if (denied) return denied

  const parsed = activityInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const { type, title, description, dueDate } = parsed.data

  if (requiresDueDate(type) && !dueDate) {
    return apiError("UNPROCESSABLE", "Informe a data da atividade.")
  }

  const ownerId = parsed.data.ownerId === undefined ? session.user.id : parsed.data.ownerId

  if (ownerId !== session.user.id && !hasPermission(session.user.role, "activities:assign")) {
    return apiError("FORBIDDEN", "Somente gestor ou administrador pode atribuir a outra pessoa.")
  }

  if (ownerId) {
    const member = await prisma.organizationMember.findFirst({
      where: { organizationId, userId: ownerId },
      select: { id: true },
    })
    if (!member) return apiError("BAD_REQUEST", "Responsavel invalido.")
  }

  const links = await checkActivityLinks({
    organizationId,
    userId: session.user.id,
    role: session.user.role,
    companyId: parsed.data.companyId ?? null,
    contactId: parsed.data.contactId ?? null,
    opportunityId: parsed.data.opportunityId ?? null,
  })
  if (!links.ok) return apiError("BAD_REQUEST", links.error)

  const activity = await prisma.activity.create({
    data: {
      organizationId,
      ownerId,
      type,
      title,
      description: description ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      completedAt: completesOnCreate(type) ? new Date() : null,
      companyId: links.companyId,
      contactId: links.contactId,
      opportunityId: links.opportunityId,
    },
  })

  return NextResponse.json({ activity }, { status: 201 })
})
