import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
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

  const opportunities = await prisma.opportunity.findMany({
    where: { organizationId },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ opportunities })
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

  if (contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    })

    if (!contact) {
      return NextResponse.json({ error: "Contato invalido." }, { status: 400 })
    }
  }

  try {
    const opportunity = await prisma.opportunity.create({
      data: {
        organizationId,
        companyId: companyId ?? null,
        contactId: contactId ?? null,
        expectedClose: expectedClose ? new Date(expectedClose) : null,
        ...rest,
      },
    })

    return NextResponse.json({ opportunity }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel salvar a oportunidade." },
      { status: 500 }
    )
  }
}
