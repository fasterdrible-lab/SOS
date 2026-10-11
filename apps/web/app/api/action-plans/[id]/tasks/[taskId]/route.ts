import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionTaskStatusUpdateSchema } from "@/lib/validations/action-task"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para atualizar tarefa." },
      { status: 401 }
    )
  }

  const { id, taskId } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const parsed = actionTaskStatusUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const existing = await prisma.actionTask.findFirst({
    where: { id: taskId, actionPlanId: id, actionPlan: { organizationId } },
    select: { id: true },
  })

  if (!existing) {
    return NextResponse.json(
      { error: "Tarefa nao encontrada." },
      { status: 404 }
    )
  }

  try {
    const task = await prisma.actionTask.update({
      where: { id: taskId },
      data: { status: parsed.data.status },
    })

    return NextResponse.json({ task })
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel atualizar a tarefa." },
      { status: 500 }
    )
  }
}
