import { NextResponse } from "next/server"

import { apiError, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { AnthropicApiError, generateSdrReply } from "@/lib/ai/anthropic-client"
import { prisma } from "@/lib/db"
import { createOpportunity } from "@/lib/opportunities/create"
import { decryptSecret } from "@/lib/security/crypto"
import { sdrLeadId, sdrOpportunityId } from "@/lib/sdr/lead-id"
import { getSdrUsageLimitError } from "@/lib/sdr/usage-limits"
import { sdrMessageInputSchema } from "@/lib/validations/sdr-conversation"

async function qualifyLead(
  organizationId: string,
  conversationId: string,
  lead: { leadName: string | null; leadEmail: string | null; leadPhone: string | null }
) {
  const leadId = sdrLeadId(conversationId)
  const opportunityId = sdrOpportunityId(conversationId)

  // Lead e oportunidade juntos: se a transacao falhar, a proxima mensagem HOT
  // tenta de novo, sem deixar lead orfao.
  await prisma.$transaction(async (tx) => {
    const existingOpportunity = await tx.opportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true },
    })
    if (existingOpportunity) return

    const qualifiedLead = await tx.lead.upsert({
      where: { id: leadId },
      create: {
        id: leadId,
        organizationId,
        name: lead.leadName ?? "Lead do IA SDR",
        email: lead.leadEmail,
        phone: lead.leadPhone,
        source: "IA SDR",
        status: "QUALIFIED",
        score: 80,
      },
      update: {},
    })

    await createOpportunity(
      tx,
      {
        id: opportunityId,
        organizationId,
        leadId: qualifiedLead.id,
        title: `Oportunidade - ${qualifiedLead.name}`,
        notes: `Gerada automaticamente pelo IA SDR (conversa ${conversationId}).`,
      },
      null
    )
  })
}

export const POST = withApiErrors("POST /api/sdr/[organizationId]/conversations/[conversationId]/messages", async (
  request: Request,
  {
    params,
  }: { params: Promise<{ organizationId: string; conversationId: string }> }
) => {
  const { organizationId, conversationId } = await params

  const conversation = await prisma.sdrConversation.findFirst({
    where: { id: conversationId, organizationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })

  if (!conversation) {
    return apiError("NOT_FOUND", "Conversa nao encontrada.")
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const parsed = sdrMessageInputSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const integration = await prisma.apiIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider: "ANTHROPIC" } },
    select: { apiKeyEncrypted: true },
  })

  if (!integration) {
    return apiError("UNPROCESSABLE", "Organizacao sem integracao de IA configurada.")
  }

  const limitError = await getSdrUsageLimitError(
    organizationId,
    conversation.messages.filter((message) => message.role === "LEAD").length
  )

  if (limitError) {
    return apiError("RATE_LIMITED", limitError)
  }

  const history = [
    ...conversation.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "LEAD" as const, content: parsed.data.content },
  ]

  let apiKey: string

  try {
    apiKey = decryptSecret(integration.apiKeyEncrypted)
  } catch (error) {
    logServerError("POST /api/sdr/[organizationId]/conversations/[conversationId]/messages", error)
    return apiError("INTERNAL", "Nao foi possivel acessar a integracao de IA.")
  }

  try {
    const result = await generateSdrReply(apiKey, history)

    const [leadMessage, assistantMessage] = await prisma.$transaction([
      prisma.sdrMessage.create({
        data: {
          conversationId,
          role: "LEAD",
          content: parsed.data.content,
        },
      }),
      prisma.sdrMessage.create({
        data: {
          conversationId,
          role: "ASSISTANT",
          content: result.reply,
        },
      }),
    ])

    await prisma.sdrConversation.update({
      where: { id: conversationId },
      data: { classification: result.classification },
    })

    if (result.classification === "HOT") {
      try {
        await qualifyLead(organizationId, conversationId, {
          leadName: conversation.leadName,
          leadEmail: conversation.leadEmail,
          leadPhone: conversation.leadPhone,
        })
      } catch (error) {
        // Efeito colateral nao-critico: a resposta ao lead segue normalmente.
        // A proxima mensagem classificada como HOT tenta novamente.
        logServerError("IA SDR: criar lead qualificado", error)
      }
    }

    return NextResponse.json({
      message: { id: assistantMessage.id, content: assistantMessage.content },
      leadMessageId: leadMessage.id,
      classification: result.classification,
    })
  } catch (error) {
    logServerError("POST /api/sdr/[organizationId]/conversations/[conversationId]/messages", error)

    if (error instanceof AnthropicApiError) {
      return apiError("UPSTREAM_FAILED", "Nao foi possivel obter resposta da IA.")
    }

    return apiError("INTERNAL", "Nao foi possivel processar a mensagem.")
  }
})
