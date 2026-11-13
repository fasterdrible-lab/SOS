import { NextResponse } from "next/server"

import { validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { settingsSession } from "@/lib/members/session"
import { getCommercialSettings, updateCommercialSettings } from "@/lib/settings/commercial"
import { commercialSettingsSchema } from "@/lib/validations/commercial-settings"

/** Configuracoes comerciais da organizacao (V2-9.3): dias para esfriar e feriados. */
export const GET = withApiErrors("GET /api/settings/commercial", async () => {
  const ctx = await settingsSession("commercial-settings:manage")
  if ("error" in ctx) return ctx.error
  return NextResponse.json({ settings: await getCommercialSettings(ctx.organizationId) })
})

export const PUT = withApiErrors("PUT /api/settings/commercial", async (request: Request) => {
  const ctx = await settingsSession("commercial-settings:manage")
  if ("error" in ctx) return ctx.error

  const parsed = commercialSettingsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const result = await updateCommercialSettings({
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    settings: parsed.data,
  })
  return NextResponse.json(result)
})
