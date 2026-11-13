import { NextResponse } from "next/server"

import { apiError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { getSaleiaMeeting } from "@/lib/saleia/service"

type Context = { params: Promise<{ id: string }> }

export const GET = withApiErrors("GET /api/saleia/meetings/[id]", async (_request: Request, { params }: Context) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para ver reunioes.")
  }

  const denied = denyUnless(session.user.role, "saleia:read")
  if (denied) return denied

  const { id } = await params
  const meeting = await getSaleiaMeeting({ organizationId, userId: session.user.id, role: session.user.role, teamId: session.user.teamId, id })
  if (!meeting) return apiError("NOT_FOUND", "Reuniao nao encontrada.")

  return NextResponse.json({ meeting })
})
