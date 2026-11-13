import { NextResponse } from "next/server"

import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { decideDiagnosis } from "@/lib/saleia/diagnosis"
import { saleiaDiagnosisDecisionSchema } from "@/lib/validations/saleia-diagnosis"

type Context = { params: Promise<{ id: string }> }

/** "So diagnostico": confirma o motivo, contesta ou desfaz a decisao. */
export const POST = withApiErrors("POST /api/saleia/meetings/[id]/diagnosis", async (request: Request, { params }: Context) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para decidir sobre a reuniao.")
  }

  const denied = denyUnless(session.user.role, "saleia:read")
  if (denied) return denied

  const parsed = saleiaDiagnosisDecisionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const { id } = await params
  const result = await decideDiagnosis({
    organizationId,
    userId: session.user.id,
    role: session.user.role,
    teamId: session.user.teamId,
    meetingId: id,
    action: parsed.data.action,
    reason: parsed.data.action === "confirm" ? parsed.data.reason : null,
  })

  if (!result.ok) return apiError(result.code, result.error)
  return NextResponse.json({ meeting: { id, diagnosis: { status: result.status, reason: result.reason } } })
})
