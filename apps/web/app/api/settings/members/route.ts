import { NextResponse } from "next/server"

import { withApiErrors } from "@/lib/api/handler"
import { listMembers } from "@/lib/members/service"
import { settingsSession } from "@/lib/members/session"

/** Pessoas da organizacao e convites em aberto (sem o link: ele so aparece ao criar). */
export const GET = withApiErrors("GET /api/settings/members", async () => {
  const ctx = await settingsSession("members:manage")
  if ("error" in ctx) return ctx.error
  return NextResponse.json(await listMembers(ctx.organizationId))
})
