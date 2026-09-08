import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { companyInputSchema } from "@/lib/validations/company"

export async function GET() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para listar empresas." },
      { status: 401 }
    )
  }

  const companies = await prisma.company.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ companies })
}

export async function POST(request: Request) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para criar empresa." },
      { status: 401 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const parsed = companyInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  try {
    const company = await prisma.company.create({
      data: {
        organizationId,
        ...parsed.data,
      },
    })

    return NextResponse.json({ company }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel salvar a empresa." },
      { status: 500 }
    )
  }
}
