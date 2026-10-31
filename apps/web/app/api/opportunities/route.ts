import { NextResponse } from "next/server"

import { apiError, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { createOpportunity, serializeOpportunity } from "@/lib/opportunities/create"
import { resolveOpportunityLinks } from "@/lib/opportunities/rules"
import { opportunityInputSchema } from "@/lib/validations/opportunity"

export const GET = withApiErrors("GET /api/opportunities", async () => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para listar oportunidades.")
  }

  const denied = denyUnless(session.user.role, "opportunities:read")
  if (denied) return denied

  const opportunities = await prisma.opportunity.findMany({
    where: {
      organizationId,
      ...opportunityScope(session.user.role, session.user.id),
    },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ opportunities: opportunities.map(serializeOpportunity) })
})

export const POST = withApiErrors("POST /api/opportunities", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para criar oportunidade.")
  }

  const denied = denyUnless(session.user.role, "opportunities:write")
  if (denied) return denied

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const parsed = opportunityInputSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const { companyId, contactId, expectedClose, ...rest } = parsed.data

  if (companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, organizationId },
      select: { id: true },
    })

    if (!company) {
      return apiError("BAD_REQUEST", "Empresa invalida.")
    }
  }

  const contact = contactId
    ? await prisma.contact.findFirst({
        where: { id: contactId, organizationId },
        select: { companyId: true },
      })
    : null

  if (contactId && !contact) {
    return apiError("BAD_REQUEST", "Contato invalido.")
  }

  const links = resolveOpportunityLinks({ companyId: companyId ?? null, contact })

  if (!links.ok) {
    return apiError("BAD_REQUEST", links.error)
  }

  try {
    const opportunity = await prisma.$transaction((tx) =>
      createOpportunity(
        tx,
        {
          organizationId,
          ownerId: session.user.id,
          companyId: links.companyId,
          contactId: contactId ?? null,
          expectedClose: expectedClose ? new Date(expectedClose) : null,
          ...rest,
        },
        session.user.id
      )
    )

    return NextResponse.json(
      { opportunity: serializeOpportunity(opportunity) },
      { status: 201 }
    )
  } catch (error) {
    logServerError("POST /api/opportunities", error)
    return apiError("INTERNAL", "Nao foi possivel salvar a oportunidade.")
  }
})
