import { NextResponse } from "next/server"

import { apiError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { revokeInvite } from "@/lib/members/service"
import { settingsSession } from "@/lib/members/session"

/** Revoga o convite: o link deixa de valer na hora. */
export const DELETE = withApiErrors(
  "DELETE /api/settings/invites/[id]",
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const ctx = await settingsSession("members:manage")
    if ("error" in ctx) return ctx.error

    const { id } = await params
    const result = await revokeInvite({ ...ctx, actorUserId: ctx.userId, id })
    if (!result.ok) return apiError(result.code, result.message)
    return NextResponse.json({ revoked: true })
  }
)
