import { NextResponse } from "next/server"

import { prisma } from "@/lib/db"
import { sdrStartConversationSchema } from "@/lib/validations/sdr-conversation"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await params

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  })

  if (!organization) {
    return NextResponse.json(
      { error: "Organizacao nao encontrada." },
      { status: 404 }
    )
  }

  const integration = await prisma.apiIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider: "ANTHROPIC" } },
    select: { id: true },
  })

  if (!integration) {
    return NextResponse.json(
      { error: "Organizacao sem integracao de IA configurada." },
      { status: 422 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = sdrStartConversationSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  try {
    const conversation = await prisma.sdrConversation.create({
      data: {
        organizationId,
        leadName: parsed.data.leadName,
        leadEmail: parsed.data.leadEmail,
        leadPhone: parsed.data.leadPhone,
      },
      select: {
        id: true,
        classification: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ conversation }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel iniciar a conversa." },
      { status: 500 }
    )
  }
}
