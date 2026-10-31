import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { createOpportunity, serializeOpportunity } from "@/lib/opportunities/create"
import { resolveOpportunityLinks } from "@/lib/opportunities/rules"
import { opportunityInputSchema } from "@/lib/validations/opportunity"

export async function GET() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para listar oportunidades." },
      { status: 401 }
    )
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
}

export async function POST(request: Request) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para criar oportunidade." },
      { status: 401 }
    )
  }

  const denied = denyUnless(session.user.role, "opportunities:write")
  if (denied) return denied

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const parsed = opportunityInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { companyId, contactId, expectedClose, ...rest } = parsed.data

  if (companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, organizationId },
      select: { id: true },
    })

    if (!company) {
      return NextResponse.json({ error: "Empresa invalida." }, { status: 400 })
    }
  }

  const contact = contactId
    ? await prisma.contact.findFirst({
        where: { id: contactId, organizationId },
        select: { companyId: true },
      })
    : null

  if (contactId && !contact) {
    return NextResponse.json({ error: "Contato invalido." }, { status: 400 })
  }

  const links = resolveOpportunityLinks({ companyId: companyId ?? null, contact })

  if (!links.ok) {
    return NextResponse.json({ error: links.error }, { status: 400 })
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
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel salvar a oportunidade." },
      { status: 500 }
    )
  }
}
