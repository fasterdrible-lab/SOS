const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const ANTHROPIC_VERSION = "2023-06-01"
const SDR_MODEL = "claude-haiku-4-5-20251001"
const CONSULTANT_MODEL = "claude-sonnet-5"

export const SDR_TEMPERATURES = ["COLD", "WARM", "HOT"] as const
export type SdrTemperature = (typeof SDR_TEMPERATURES)[number]

export type SdrChatMessage = {
  role: "LEAD" | "ASSISTANT"
  content: string
}

export type SdrChatResult = {
  reply: string
  classification: SdrTemperature
}

export class AnthropicApiError extends Error {}

const SDR_SYSTEM_PROMPT = `Voce e um SDR (pre-vendas) da empresa. Converse com o lead de forma consultiva, curta e objetiva, buscando entender a necessidade dele. A cada mensagem, classifique a conversa em COLD (curiosidade, sem intencao clara), WARM (interesse real, ainda explorando) ou HOT (pronto para falar com um consultor/comprar). Sempre responda usando a ferramenta "responder_lead".`

const RESPOND_TOOL = {
  name: "responder_lead",
  description: "Responde ao lead e classifica o nivel de interesse da conversa.",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string", description: "Resposta ao lead." },
      classification: { type: "string", enum: SDR_TEMPERATURES },
    },
    required: ["reply", "classification"],
  },
}

export async function generateSdrReply(
  apiKey: string,
  history: SdrChatMessage[]
): Promise<SdrChatResult> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: SDR_MODEL,
      max_tokens: 1024,
      system: SDR_SYSTEM_PROMPT,
      messages: history.map((message) => ({
        role: message.role === "LEAD" ? "user" : "assistant",
        content: message.content,
      })),
      tools: [RESPOND_TOOL],
      tool_choice: { type: "tool", name: "responder_lead" },
    }),
  })

  if (!response.ok) {
    throw new AnthropicApiError(`Anthropic API respondeu ${response.status}.`)
  }

  const data = await response.json()
  const toolUse = data?.content?.find(
    (block: { type: string }) => block.type === "tool_use"
  )

  if (!toolUse?.input?.reply || !toolUse?.input?.classification) {
    throw new AnthropicApiError("Resposta da Anthropic sem o formato esperado.")
  }

  const classification = SDR_TEMPERATURES.includes(toolUse.input.classification)
    ? (toolUse.input.classification as SdrTemperature)
    : "COLD"

  return {
    reply: String(toolUse.input.reply),
    classification,
  }
}

export type ConsultantChatMessage = {
  role: "USER" | "ASSISTANT"
  content: string
}

const CONSULTANT_SYSTEM_PROMPT = `Voce e o Consultor Digital do SalesOS, um assistente estrategico para o consultor comercial responsavel por esta organizacao. Use o contexto fornecido (ultimo diagnostico comercial e KPIs atuais do CRM) para dar recomendacoes praticas, especificas e acionaveis. Seja direto e objetivo, priorizando o que tem mais impacto.`

export async function generateConsultantReply(
  apiKey: string,
  context: string,
  history: ConsultantChatMessage[]
): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: CONSULTANT_MODEL,
      max_tokens: 1024,
      system: `${CONSULTANT_SYSTEM_PROMPT}\n\n${context}`,
      messages: history.map((message) => ({
        role: message.role === "USER" ? "user" : "assistant",
        content: message.content,
      })),
    }),
  })

  if (!response.ok) {
    throw new AnthropicApiError(`Anthropic API respondeu ${response.status}.`)
  }

  const data = await response.json()
  const textBlock = data?.content?.find(
    (block: { type: string }) => block.type === "text"
  )

  if (!textBlock?.text) {
    throw new AnthropicApiError("Resposta da Anthropic sem o formato esperado.")
  }

  return String(textBlock.text)
}
