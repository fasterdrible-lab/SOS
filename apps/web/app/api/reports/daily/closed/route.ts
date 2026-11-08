import { NextResponse } from "next/server"

import { apiError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { resolveReportSubject } from "@/lib/report/access"
import { listClosedReports } from "@/lib/report/service"

/** Dias fechados: os proprios, ou da equipe (`?vendedor=` filtra) para gestor e administrador. */
export const GET = withApiErrors("GET /api/reports/daily/closed", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para ver o report.")
  }

  const denied = denyUnless(session.user.role, "reports:read")
  if (denied) return denied

  const requested = new URL(request.url).searchParams.get("vendedor")
  const subject = await resolveReportSubject({
    organizationId,
    userId: session.user.id,
    role: session.user.role,
    requested,
  })
  if (subject.invalid) return apiError("NOT_FOUND", "Vendedor nao encontrado.")

  const reports = await listClosedReports({
    organizationId,
    userId: session.user.id,
    role: session.user.role,
    sellerId: requested ? subject.subjectId : null,
  })

  return NextResponse.json({ reports })
})
