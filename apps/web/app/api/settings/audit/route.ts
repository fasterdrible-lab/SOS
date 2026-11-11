import { NextResponse } from "next/server"

import { withApiErrors } from "@/lib/api/handler"
import { listAuditLog } from "@/lib/audit/query"
import { settingsSession } from "@/lib/members/session"

/** Registro de auditoria: `?acao=&pessoa=&depois=<id da ultima linha>`. */
export const GET = withApiErrors("GET /api/settings/audit", async (request: Request) => {
  const ctx = await settingsSession("audit:read")
  if ("error" in ctx) return ctx.error

  const params = new URL(request.url).searchParams
  return NextResponse.json(
    await listAuditLog({
      organizationId: ctx.organizationId,
      action: params.get("acao"),
      actorId: params.get("pessoa"),
      cursor: params.get("depois"),
    })
  )
})
