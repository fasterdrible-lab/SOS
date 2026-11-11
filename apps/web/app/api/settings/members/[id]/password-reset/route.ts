import { NextResponse } from "next/server"

import { apiError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { createPasswordReset } from "@/lib/members/service"
import { settingsSession } from "@/lib/members/session"

/** Gera o link de nova senha para quem esqueceu. O link aparece uma unica vez. */
export const POST = withApiErrors(
  "POST /api/settings/members/[id]/password-reset",
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const ctx = await settingsSession("members:manage")
    if ("error" in ctx) return ctx.error

    const { id } = await params
    const result = await createPasswordReset({ ...ctx, actorUserId: ctx.userId, memberId: id })
    if (!result.ok) return apiError(result.code, result.message)

    return NextResponse.json(
      { expiresAt: result.expiresAt, path: `/redefinir-senha/${result.token}` },
      { status: 201 }
    )
  }
)
