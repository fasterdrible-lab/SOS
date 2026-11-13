import { NextResponse } from "next/server"

import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { settingsSession } from "@/lib/members/session"
import { createTeam, listTeams } from "@/lib/teams/service"
import { teamNameSchema } from "@/lib/validations/member"

export const GET = withApiErrors("GET /api/settings/teams", async () => {
  const ctx = await settingsSession("members:manage")
  if ("error" in ctx) return ctx.error
  return NextResponse.json({ teams: await listTeams(ctx.organizationId) })
})

export const POST = withApiErrors("POST /api/settings/teams", async (request: Request) => {
  const ctx = await settingsSession("members:manage")
  if ("error" in ctx) return ctx.error

  const parsed = teamNameSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const result = await createTeam({ ...ctx, actorUserId: ctx.userId, name: parsed.data.name })
  if (!result.ok) return apiError(result.code, result.message)
  return NextResponse.json({ id: result.id, name: result.name }, { status: 201 })
})
