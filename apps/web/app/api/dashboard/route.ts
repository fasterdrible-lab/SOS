import { NextResponse } from "next/server"

import { apiError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import {
  getDashboardMembers,
  getExecutiveDashboard,
  resolveSellerFilter,
} from "@/lib/dashboard/executive"
import { parsePeriod } from "@/lib/dashboard/period"

export const GET = withApiErrors("GET /api/dashboard", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para ver o dashboard.")
  }

  const denied = denyUnless(session.user.role, "dashboard:read")
  if (denied) return denied

  const params = new URL(request.url).searchParams
  const members = await getDashboardMembers(organizationId)
  const seller = resolveSellerFilter(session.user.role, members, params.get("vendedor"))
  if (seller.invalid) {
    return apiError("NOT_FOUND", "Vendedor nao encontrado nesta organizacao.")
  }

  const dashboard = await getExecutiveDashboard({
    organizationId,
    userId: session.user.id,
    role: session.user.role,
    period: parsePeriod(params.get("periodo")),
    sellerId: seller.sellerId,
    members,
  })

  return NextResponse.json({ dashboard })
})
