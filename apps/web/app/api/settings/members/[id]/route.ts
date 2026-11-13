import { NextResponse } from "next/server"

import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { changeMemberRole, removeMember } from "@/lib/members/service"
import { settingsSession } from "@/lib/members/session"
import { setMemberTeam } from "@/lib/teams/service"
import { memberUpdateSchema } from "@/lib/validations/member"

type Params = { params: Promise<{ id: string }> }

export const PATCH = withApiErrors("PATCH /api/settings/members/[id]", async (request: Request, { params }: Params) => {
  const ctx = await settingsSession("members:manage")
  if ("error" in ctx) return ctx.error

  const parsed = memberUpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const { id } = await params
  const { role, teamId } = parsed.data
  const actor = { ...ctx, actorUserId: ctx.userId, memberId: id }

  if (role !== undefined) {
    const result = await changeMemberRole({ ...actor, role })
    if (!result.ok) return apiError(result.code, result.message)
  }
  if (teamId !== undefined) {
    const result = await setMemberTeam({ ...actor, teamId })
    if (!result.ok) return apiError(result.code, result.message)
  }
  return NextResponse.json({
    id,
    ...(role !== undefined ? { role } : {}),
    ...(teamId !== undefined ? { teamId } : {}),
  })
})

export const DELETE = withApiErrors("DELETE /api/settings/members/[id]", async (_request: Request, { params }: Params) => {
  const ctx = await settingsSession("members:manage")
  if ("error" in ctx) return ctx.error

  const { id } = await params
  const result = await removeMember({ ...ctx, actorUserId: ctx.userId, memberId: id })
  if (!result.ok) return apiError(result.code, result.message)
  return NextResponse.json({ removed: true })
})
