import { NextResponse } from "next/server"

import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { acceptInvite } from "@/lib/members/service"
import { inviteAcceptSchema } from "@/lib/validations/member"

/**
 * Aceite do convite (rota publica, liberada em lib/auth.config.ts). O token de
 * 256 bits e a autenticacao; conta existente ainda prova a senha.
 */
export const POST = withApiErrors(
  "POST /api/invites/[token]",
  async (request: Request, { params }: { params: Promise<{ token: string }> }) => {
    const parsed = inviteAcceptSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error)

    const { token } = await params
    const result = await acceptInvite({ token, ...parsed.data })
    if (!result.ok) return apiError(result.code, result.message)
    return NextResponse.json({ email: result.email }, { status: 201 })
  }
)
