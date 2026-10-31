import { NextResponse } from "next/server"

import { apiError, logServerError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { prisma } from "@/lib/db"
import { diagnosticActionPlanId } from "@/lib/diagnostico/action-plan-id"
import type { DiagnosticInsight } from "@/lib/scoring/insights"

export const POST = withApiErrors("POST /api/diagnosticos/[id]/plano", async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para gerar plano de acao.")
  }

  const denied = denyUnless(session.user.role, "action-plans:write")
  if (denied) return denied

  const { id } = await params

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { id, organizationId },
  })

  if (!diagnostic) {
    return apiError("NOT_FOUND", "Diagnostico nao encontrado.")
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
  } catch (error) {
    logServerError("POST /api/diagnosticos/[id]/plano", error)
    return apiError("INTERNAL", "Nao foi possivel gerar o plano de acao.")
  }
})
