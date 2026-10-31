import { NextResponse } from "next/server"

import { apiError, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { prisma } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"
import { generateBottlenecks, generateRecommendations } from "@/lib/scoring/insights"
import { calculateMaturityScore } from "@/lib/scoring/maturity"
import { diagnosticInputSchema } from "@/lib/validations/diagnostic"

export const POST = withApiErrors("POST /api/diagnosticos", async (request: Request) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para criar diagnostico.")
  }

  const denied = denyUnless(session.user.role, "diagnostics:write")
  if (denied) return denied

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const parsed = diagnosticInputSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const maturityScore = calculateMaturityScore(parsed.data)
  const bottlenecks = generateBottlenecks(parsed.data)
  const recommendations = generateRecommendations(parsed.data)

  try {
    const diagnostic = await prisma.diagnostic.create({
      data: {
        organizationId,
        ...parsed.data,
        maturityScore,
        bottlenecks: bottlenecks as unknown as Prisma.InputJsonValue,
        recommendations: recommendations as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        maturityScore: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ diagnostic }, { status: 201 })
  } catch (error) {
    logServerError("POST /api/diagnosticos", error)
    return apiError("INTERNAL", "Nao foi possivel salvar o diagnostico.")
  }
})
