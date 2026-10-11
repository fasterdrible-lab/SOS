import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionPlanInputSchema } from "@/lib/validations/action-plan"

export async function GET() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para listar planos de acao." },
      { status: 401 }
    )
  }

  const actionPlans = await prisma.actionPlan.findMany({
    where: { organizationId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ actionPlans })
}

export async function POST(request: Request) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para criar plano de acao." },
      { status: 401 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const parsed = actionPlanInputSchema.safeParse(body)

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
    const actionPlan = await prisma.actionPlan.create({
      data: {
        organizationId,
        ...parsed.data,
      },
    })

    return NextResponse.json({ actionPlan }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel salvar o plano de acao." },
      { status: 500 }
    )
  }
}
