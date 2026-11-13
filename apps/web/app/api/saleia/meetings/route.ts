import { NextResponse } from "next/server"

import { apiError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { listSaleiaMeetings } from "@/lib/saleia/service"

const LIMIT = 200

/** Reunioes recebidas do SALE-IA, no escopo do papel. `?vinculo=sem` lista as sem empresa. */
export const GET = withApiErrors("GET /api/saleia/meetings", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para ver reunioes.")
  }

  const denied = denyUnless(session.user.role, "saleia:read")
  if (denied) return denied

  const unlinked = new URL(request.url).searchParams.get("vinculo") === "sem"
  const meetings = await listSaleiaMeetings({
    organizationId,
    userId: session.user.id,
    role: session.user.role,
    teamId: session.user.teamId,
    where: unlinked ? { companyId: null } : undefined,
    take: LIMIT,
  })

  return NextResponse.json({ meetings })
})
