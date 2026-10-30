import { prisma } from "@/lib/db"

// Cada mensagem do lead na rota publica consome a chave Anthropic da organizacao.
// Mensagens que falham na IA nao sao persistidas, entao nao contam para os limites.
export const MAX_LEAD_MESSAGES_PER_CONVERSATION = 30
export const MAX_LEAD_MESSAGES_PER_ORGANIZATION_PER_DAY = 300

const DAY_IN_MS = 24 * 60 * 60 * 1000

export async function getSdrUsageLimitError(
  organizationId: string,
  conversationLeadMessages: number
): Promise<string | null> {
  if (conversationLeadMessages >= MAX_LEAD_MESSAGES_PER_CONVERSATION) {
    return "Esta conversa atingiu o limite de mensagens."
  }

  const organizationLeadMessages = await prisma.sdrMessage.count({
    where: {
      role: "LEAD",
      createdAt: { gte: new Date(Date.now() - DAY_IN_MS) },
      conversation: { organizationId },
    },
  })

  if (organizationLeadMessages >= MAX_LEAD_MESSAGES_PER_ORGANIZATION_PER_DAY) {
    return "Atendimento temporariamente indisponivel. Tente novamente mais tarde."
  }

  return null
}
