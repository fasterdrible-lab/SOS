import { NextResponse } from "next/server"

import { apiError, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { prisma } from "@/lib/db"
import { contactInputSchema } from "@/lib/validations/contact"

export const GET = withApiErrors("GET /api/contacts", async () => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para listar contatos.")
  }

  const denied = denyUnless(session.user.role, "crm:read")
  if (denied) return denied

  const contacts = await prisma.contact.findMany({
    where: { organizationId },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ contacts })
})

export const POST = withApiErrors("POST /api/contacts", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para criar contato.")
  }

  const denied = denyUnless(session.user.role, "crm:write")
  if (denied) return denied

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const parsed = contactInputSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const { companyId, ...rest } = parsed.data

  if (companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, organizationId },
      select: { id: true },
    })

    if (!company) {
      return apiError("BAD_REQUEST", "Empresa invalida.")
    }
  }

  try {
    const contact = await prisma.contact.create({
      data: {
        organizationId,
        companyId: companyId ?? null,
        ...rest,
      },
    })

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    logServerError("POST /api/contacts", error)
    return apiError("INTERNAL", "Nao foi possivel salvar o contato.")
  }
})
