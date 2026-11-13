import { NextResponse } from "next/server"

import { apiError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { getHeaderNotifications } from "@/lib/notifications/summary"

export const GET = withApiErrors("GET /api/notifications", async () => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para ver notificacoes.")
  }

  const denied = denyUnless(session.user.role, "my-day:read")
  if (denied) return denied

  const notifications = await getHeaderNotifications({
    organizationId,
    userId: session.user.id,
    role: session.user.role, teamId: session.user.teamId,
  })

  return NextResponse.json({ notifications })
})
