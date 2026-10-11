import { NextResponse } from "next/server"

import {
  AnthropicApiError,
  generateConsultantReply,
} from "@/lib/ai/anthropic-client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getExecutiveKpis } from "@/lib/dashboard/kpis"
import { decryptSecret } from "@/lib/security/crypto"
import { consultantMessageInputSchema } from "@/lib/validations/consultant-message"

async function buildContext(organizationId: string): Promise<string> {
  const [diagnostic, kpis] = await Promise.all([
    prisma.diagnostic.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    }),
    getExecutiveKpis(organizationId),
  ])

  const diagnosticSummary = diagnostic
    ? `Ultimo diagnostico comercial (${diagnostic.companyName}): nota de maturidade ${diagnostic.maturityScore}/100. Gargalos: ${JSON.stringify(diagnostic.bottlenecks ?? [])}. Recomendacoes: ${JSON.stringify(diagnostic.recommendations ?? [])}.`
    : "Nenhum diagnostico comercial cadastrado ainda para esta organizacao."

  const kpisSummary = `KPIs atuais do CRM: pipeline total R$ ${kpis.pipelineTotal.toFixed(2)}, ${kpis.activeLeads} leads ativos, ${kpis.openOpportunities} oportunidades abertas, taxa de conversao ${kpis.conversionRate.toFixed(1)}%.`

  return `${diagnosticSummary}\n${kpisSummary}`
}

export async function GET() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para acessar o consultor digital." },
      { status: 401 }
    )
  }

  const conversation = await prisma.consultantConversation.findUnique({
    where: { organizationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })

  return NextResponse.json({ messages: conversation?.messages ?? [] })
}

export async function POST(request: Request) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para acessar o consultor digital." },
      { status: 401 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const parsed = consultantMessageInputSchema.safeParse(body)

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

  const conversation = await prisma.consultantConversation.upsert({
    where: { organizationId },
    create: { organizationId },
    update: {},
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })

  let apiKey: string

  try {
    apiKey = decryptSecret(integration.apiKeyEncrypted)
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel acessar a integracao de IA." },
      { status: 500 }
    )
  }

  const history = [
    ...conversation.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "USER" as const, content: parsed.data.content },
  ]

  try {
    const context = await buildContext(organizationId)
    const reply = await generateConsultantReply(apiKey, context, history)

    const [userMessage, assistantMessage] = await prisma.$transaction([
      prisma.consultantMessage.create({
        data: {
          conversationId: conversation.id,
          role: "USER",
          content: parsed.data.content,
        },
      }),
      prisma.consultantMessage.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: reply,
        },
      }),
    ])

    return NextResponse.json({
      message: { id: assistantMessage.id, content: assistantMessage.content },
      userMessageId: userMessage.id,
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
