import { NextResponse } from "next/server"

import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { createInvite } from "@/lib/members/service"
import { settingsSession } from "@/lib/members/session"
import { inviteCreateSchema } from "@/lib/validations/member"

/** Cria o convite e devolve o link uma unica vez. */
export const POST = withApiErrors("POST /api/settings/invites", async (request: Request) => {
  const ctx = await settingsSession("members:manage")
  if ("error" in ctx) return ctx.error

  const parsed = inviteCreateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const result = await createInvite({ ...ctx, actorUserId: ctx.userId, ...parsed.data })
  if (!result.ok) return apiError(result.code, result.message)

  return NextResponse.json(
    { id: result.inviteId, expiresAt: result.expiresAt, path: `/convite/${result.token}` },
    { status: 201 }
  )
})
