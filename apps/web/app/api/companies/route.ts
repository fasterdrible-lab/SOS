import { NextResponse } from "next/server"

import { apiError, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { prisma } from "@/lib/db"
import { companyInputSchema } from "@/lib/validations/company"

export const GET = withApiErrors("GET /api/companies", async () => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para listar empresas.")
  }

  const denied = denyUnless(session.user.role, "crm:read")
  if (denied) return denied

  const companies = await prisma.company.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ companies })
})

export const POST = withApiErrors("POST /api/companies", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para criar empresa.")
  }

  const denied = denyUnless(session.user.role, "crm:write")
  if (denied) return denied

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const parsed = companyInputSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  try {
    const company = await prisma.company.create({
      data: {
        organizationId,
        ...parsed.data,
      },
    })

    return NextResponse.json({ company }, { status: 201 })
  } catch (error) {
    logServerError("POST /api/companies", error)
    return apiError("INTERNAL", "Nao foi possivel salvar a empresa.")
  }
})
