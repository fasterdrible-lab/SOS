import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"
import { generateBottlenecks, generateRecommendations } from "@/lib/scoring/insights"
import { calculateMaturityScore } from "@/lib/scoring/maturity"
import { diagnosticInputSchema } from "@/lib/validations/diagnostic"

export async function POST(request: Request) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para criar diagnostico." },
      { status: 401 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const parsed = diagnosticInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
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
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel salvar o diagnostico." },
      { status: 500 }
    )
  }
}
