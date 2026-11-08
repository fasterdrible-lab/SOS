import { NextResponse } from "next/server"

import { apiError, codeForStatus, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { resolveReportSubject } from "@/lib/report/access"
import { parseDayKey, resolveReportDay } from "@/lib/report/rules"
import { closeDailyReport, getDailyReport } from "@/lib/report/service"
import { calendarDateIn } from "@/lib/time/business-calendar"
import { dailyReportCloseSchema } from "@/lib/validations/daily-report"

/** O dia (`?dia=AAAA-MM-DD`, padrao hoje) de quem pede ou, para gestor, de `?vendedor=`. */
export const GET = withApiErrors("GET /api/reports/daily", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para ver o report.")
  }

  const denied = denyUnless(session.user.role, "reports:read")
  if (denied) return denied

  const params = new URL(request.url).searchParams
  const subject = await resolveReportSubject({
    organizationId,
    userId: session.user.id,
    role: session.user.role,
    requested: params.get("vendedor"),
  })
  if (subject.invalid) return apiError("NOT_FOUND", "Vendedor nao encontrado.")

  const day = resolveReportDay(params.get("dia"), calendarDateIn(new Date()))
  const report = await getDailyReport({ organizationId, userId: subject.subjectId, day })

  return NextResponse.json({ report })
})

/** Fecha o proprio dia. Cada pessoa fecha so o seu. */
export const POST = withApiErrors("POST /api/reports/daily", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para fechar o dia.")
  }

  const denied = denyUnless(session.user.role, "reports:read")
  if (denied) return denied

  const parsed = dailyReportCloseSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const today = calendarDateIn(new Date())
  const day = parsed.data.day ? parseDayKey(parsed.data.day) : today
  if (!day) return apiError("BAD_REQUEST", "Data invalida.", { day: ["Use AAAA-MM-DD."] })

  const result = await closeDailyReport({
    organizationId,
    userId: session.user.id,
    day,
    today,
    notes: parsed.data.notes,
  })
  if (!result.ok) return apiError(codeForStatus(result.status), result.error)

  return NextResponse.json({ report: result.report }, { status: 201 })
})
