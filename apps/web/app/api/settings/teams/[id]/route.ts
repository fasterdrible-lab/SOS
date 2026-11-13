import { NextResponse } from "next/server"

import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { settingsSession } from "@/lib/members/session"
import { removeTeam, renameTeam } from "@/lib/teams/service"
import { teamNameSchema } from "@/lib/validations/member"

type Params = { params: Promise<{ id: string }> }

export const PATCH = withApiErrors("PATCH /api/settings/teams/[id]", async (request: Request, { params }: Params) => {
  const ctx = await settingsSession("members:manage")
  if ("error" in ctx) return ctx.error

  const parsed = teamNameSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const { id } = await params
  const result = await renameTeam({ ...ctx, actorUserId: ctx.userId, id, name: parsed.data.name })
  if (!result.ok) return apiError(result.code, result.message)
  return NextResponse.json({ id: result.id, name: result.name })
})

/** As pessoas da equipe ficam sem equipe; nada mais e apagado. */
export const DELETE = withApiErrors("DELETE /api/settings/teams/[id]", async (_request: Request, { params }: Params) => {
  const ctx = await settingsSession("members:manage")
  if ("error" in ctx) return ctx.error

  const { id } = await params
  const result = await removeTeam({ ...ctx, actorUserId: ctx.userId, id })
  if (!result.ok) return apiError(result.code, result.message)
  return NextResponse.json({ removed: true, members: result.members })
})
