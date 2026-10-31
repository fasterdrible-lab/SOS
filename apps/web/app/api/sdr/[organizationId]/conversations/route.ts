import { NextResponse } from "next/server"

import { apiError, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { prisma } from "@/lib/db"
import { sdrStartConversationSchema } from "@/lib/validations/sdr-conversation"

export const POST = withApiErrors("POST /api/sdr/[organizationId]/conversations", async (
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) => {
  const { organizationId } = await params

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  })

  if (!organization) {
    return apiError("NOT_FOUND", "Organizacao nao encontrada.")
  }

  const integration = await prisma.apiIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider: "ANTHROPIC" } },
    select: { id: true },
  })

  if (!integration) {
    return apiError("UNPROCESSABLE", "Organizacao sem integracao de IA configurada.")
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = sdrStartConversationSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
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
  } catch (error) {
    logServerError("POST /api/sdr/[organizationId]/conversations", error)
    return apiError("INTERNAL", "Nao foi possivel iniciar a conversa.")
  }
})
