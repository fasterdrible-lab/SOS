import { NextResponse } from "next/server"

import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { recordAudit } from "@/lib/audit/record"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { getCompanyOverview } from "@/lib/companies/overview"
import { prisma } from "@/lib/db"
import { companyEditSchema } from "@/lib/validations/company"

type Context = { params: Promise<{ id: string }> }

export const GET = withApiErrors("GET /api/companies/[id]", async (_request: Request, { params }: Context) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para ver empresa.")
  }

  const denied = denyUnless(session.user.role, "crm:read")
  if (denied) return denied

  const company = await getCompanyOverview({
    id: (await params).id,
    organizationId,
    userId: session.user.id,
    role: session.user.role,
  })

  if (!company) return apiError("NOT_FOUND", "Empresa nao encontrada.")

  return NextResponse.json({ company })
})

export const PUT = withApiErrors("PUT /api/companies/[id]", async (request: Request, { params }: Context) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para editar empresa.")
  }

  const denied = denyUnless(session.user.role, "crm:write")
  if (denied) return denied

  const parsed = companyEditSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const { id } = await params
  const existing = await prisma.company.findFirst({ where: { id, organizationId } })
  if (!existing) return apiError("NOT_FOUND", "Empresa nao encontrada.")

  const fields = (Object.keys(parsed.data) as (keyof typeof parsed.data)[]).filter(
    (field) => parsed.data[field] !== existing[field]
  )
  if (fields.length === 0) return NextResponse.json({ company: existing })

  const company = await prisma.$transaction(async (tx) => {
    const updated = await tx.company.update({ where: { id }, data: parsed.data })
    await recordAudit(
      {
        organizationId,
        actorUserId: session.user.id,
        action: "company.updated",
        entityType: "Company",
        entityId: id,
        metadata: { fields },
      },
      tx
    )
    return updated
  })

  return NextResponse.json({ company })
})
