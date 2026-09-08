import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { contactInputSchema } from "@/lib/validations/contact"

export async function GET() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para listar contatos." },
      { status: 401 }
    )
  }

  const contacts = await prisma.contact.findMany({
    where: { organizationId },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ contacts })
}

export async function POST(request: Request) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para criar contato." },
      { status: 401 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const parsed = contactInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { companyId, ...rest } = parsed.data

  if (companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, organizationId },
      select: { id: true },
    })

    if (!company) {
      return NextResponse.json({ error: "Empresa invalida." }, { status: 400 })
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
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel salvar o contato." },
      { status: 500 }
    )
  }
}
