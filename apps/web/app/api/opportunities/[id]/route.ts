import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { opportunityStageUpdateSchema } from "@/lib/validations/opportunity"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para atualizar oportunidade." },
      { status: 401 }
    )
  }

  const { id } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const parsed = opportunityStageUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const existing = await prisma.opportunity.findFirst({
    where: { id, organizationId },
    select: { id: true },
  })

  if (!existing) {
    return NextResponse.json(
      { error: "Oportunidade nao encontrada." },
      { status: 404 }
    )
  }

  try {
    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: { stage: parsed.data.stage },
    })

    return NextResponse.json({ opportunity })
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel atualizar a oportunidade." },
      { status: 500 }
    )
  }
}
