import { NextResponse } from "next/server"

import { apiError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { getMyDaySummary } from "@/lib/meu-dia/summary"

export const GET = withApiErrors("GET /api/meu-dia", async () => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para ver o Meu Dia.")
  }

  const denied = denyUnless(session.user.role, "my-day:read")
  if (denied) return denied

  const summary = await getMyDaySummary({
    organizationId,
    userId: session.user.id,
    role: session.user.role,
  })

  return NextResponse.json({ summary })
})
