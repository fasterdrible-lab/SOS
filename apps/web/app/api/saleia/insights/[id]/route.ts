import { NextResponse } from "next/server"

import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { decideSaleiaInsight } from "@/lib/saleia/decisions"
import { saleiaInsightDecisionSchema } from "@/lib/validations/saleia-insight"

type Context = { params: Promise<{ id: string }> }

/** Aceita (cria a atividade ou aplica a etapa), descarta ou reabre um insight. */
export const POST = withApiErrors("POST /api/saleia/insights/[id]", async (request: Request, { params }: Context) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para decidir recomendacoes.")
  }

  const denied = denyUnless(session.user.role, "saleia:read")
  if (denied) return denied

  const parsed = saleiaInsightDecisionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const result = await decideSaleiaInsight({
    organizationId,
    userId: session.user.id,
    role: session.user.role, teamId: session.user.teamId,
    insightId: (await params).id,
    action: parsed.data.action,
  })

  if (!result.ok) return apiError(result.code, result.error)

  return NextResponse.json({
    insight: { id: (await params).id, status: result.status },
    activityId: result.activityId,
    stageChanged: result.stageChanged,
  })
})
