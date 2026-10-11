import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionTaskInputSchema } from "@/lib/validations/action-task"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para listar tarefas." },
      { status: 401 }
    )
  }

  const { id } = await params

  const actionPlan = await prisma.actionPlan.findFirst({
    where: { id, organizationId },
    select: { id: true },
  })

  if (!actionPlan) {
    return NextResponse.json(
      { error: "Plano de acao nao encontrado." },
      { status: 404 }
    )
  }

  const tasks = await prisma.actionTask.findMany({
    where: { actionPlanId: id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ tasks })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para criar tarefa." },
      { status: 401 }
    )
  }

  const { id } = await params

  const actionPlan = await prisma.actionPlan.findFirst({
    where: { id, organizationId },
    select: { id: true },
  })

  if (!actionPlan) {
    return NextResponse.json(
      { error: "Plano de acao nao encontrado." },
      { status: 404 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const parsed = actionTaskInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { dueDate, ...rest } = parsed.data

  try {
    const task = await prisma.actionTask.create({
      data: {
        actionPlanId: id,
        dueDate: dueDate ? new Date(dueDate) : null,
        ...rest,
      },
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel salvar a tarefa." },
      { status: 500 }
    )
  }
}
