import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { diagnosticActionPlanId } from "@/lib/diagnostico/action-plan-id"
import type { DiagnosticInsight } from "@/lib/scoring/insights"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para gerar plano de acao." },
      { status: 401 }
    )
  }

  const { id } = await params

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { id, organizationId },
  })

  if (!diagnostic) {
    return NextResponse.json(
      { error: "Diagnostico nao encontrado." },
      { status: 404 }
    )
  }

  const actionPlanId = diagnosticActionPlanId(diagnostic.id)

  const existingActionPlan = await prisma.actionPlan.findFirst({
    where: { id: actionPlanId, organizationId },
  })

  if (existingActionPlan) {
    return NextResponse.json({ actionPlan: existingActionPlan })
  }

  const recommendations =
    (diagnostic.recommendations as DiagnosticInsight[] | null) ?? []

  try {
    const actionPlan = await prisma.actionPlan.create({
      data: {
        id: actionPlanId,
        organizationId,
        title: `Plano de Acao - ${diagnostic.companyName}`,
        objective: `Executar as recomendacoes do diagnostico comercial (nota ${diagnostic.maturityScore}/100) para elevar a maturidade comercial de ${diagnostic.companyName}.`,
        tasks: {
          create: recommendations.map((item) => ({
            title: item.title,
            description: item.detail,
          })),
        },
      },
    })

    return NextResponse.json({ actionPlan }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel gerar o plano de acao." },
      { status: 500 }
    )
  }
}
