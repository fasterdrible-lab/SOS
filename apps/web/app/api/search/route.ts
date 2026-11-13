import { NextResponse } from "next/server"

import { apiError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { globalSearch } from "@/lib/search/global-search"
import { SEARCH_MIN_LENGTH, normalizeSearchTerm } from "@/lib/search/query"

export const GET = withApiErrors("GET /api/search", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para buscar.")
  }

  const term = normalizeSearchTerm(new URL(request.url).searchParams.get("q"))
  if (!term) {
    return apiError("BAD_REQUEST", `Digite ao menos ${SEARCH_MIN_LENGTH} caracteres para buscar.`)
  }

  const groups = await globalSearch({
    organizationId,
    userId: session.user.id,
    role: session.user.role, teamId: session.user.teamId,
    term,
  })

  return NextResponse.json({ term, groups })
})
