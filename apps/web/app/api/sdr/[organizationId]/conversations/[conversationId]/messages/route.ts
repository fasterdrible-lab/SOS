import { NextResponse } from "next/server"

import { AnthropicApiError, generateSdrReply } from "@/lib/ai/anthropic-client"
import { prisma } from "@/lib/db"
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

  const existingLead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (existingLead) return

  const createdLead = await prisma.lead.create({
    data: {
      id: leadId,
      organizationId,
      name: lead.leadName ?? "Lead do IA SDR",
      email: lead.leadEmail,
      phone: lead.leadPhone,
      source: "IA SDR",
      status: "QUALIFIED",
      score: 80,
    },
  })

  await prisma.opportunity.create({
    data: {
      id: sdrOpportunityId(conversationId),
      organizationId,
      leadId: createdLead.id,
      title: `Oportunidade - ${createdLead.name}`,
      notes: `Gerada automaticamente pelo IA SDR (conversa ${conversationId}).`,
    },
  })
}

export async function POST(
  request: Request,
  {
    params,
  }: { params: Promise<{ organizationId: string; conversationId: string }> }
) {
  const { organizationId, conversationId } = await params

  const conversation = await prisma.sdrConversation.findFirst({
    where: { id: conversationId, organizationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversa nao encontrada." },
      { status: 404 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const parsed = sdrMessageInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const integration = await prisma.apiIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider: "ANTHROPIC" } },
    select: { apiKeyEncrypted: true },
  })

  if (!integration) {
    return NextResponse.json(
      { error: "Organizacao sem integracao de IA configurada." },
      { status: 422 }
    )
  }

  const limitError = await getSdrUsageLimitError(
    organizationId,
    conversation.messages.filter((message) => message.role === "LEAD").length
  )

  if (limitError) {
    return NextResponse.json({ error: limitError }, { status: 429 })
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
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel acessar a integracao de IA." },
      { status: 500 }
    )
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
      } catch {
        // Efeito colateral nao-critico: a resposta ao lead segue normalmente.
        // A proxima mensagem classificada como HOT tenta novamente.
      }
    }

    return NextResponse.json({
      message: { id: assistantMessage.id, content: assistantMessage.content },
      leadMessageId: leadMessage.id,
      classification: result.classification,
    })
  } catch (error) {
    if (error instanceof AnthropicApiError) {
      return NextResponse.json(
        { error: "Nao foi possivel obter resposta da IA." },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: "Nao foi possivel processar a mensagem." },
      { status: 500 }
    )
  }
}
