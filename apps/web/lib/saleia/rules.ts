// Regras da integracao SALEIA. Puras: consultas e gravacao ficam em service.ts.

export const INSIGHT_KINDS = [
  "RECOMMENDATION",
  "OBJECTION",
  "BUYING_SIGNAL",
  "PAIN",
  "EVIDENCE",
  "STAGE_SUGGESTION",
] as const

export type InsightKind = (typeof INSIGHT_KINDS)[number]

export const INSIGHT_LABELS: Record<InsightKind, string> = {
  RECOMMENDATION: "Recomendação",
  OBJECTION: "Objeção",
  BUYING_SIGNAL: "Sinal de compra",
  PAIN: "Dor",
  EVIDENCE: "Evidência",
  STAGE_SUGGESTION: "Etapa sugerida",
}

/** Ordem de exibicao: o que pede acao primeiro. */
export const INSIGHT_ORDER: InsightKind[] = [
  "RECOMMENDATION",
  "STAGE_SUGGESTION",
  "OBJECTION",
  "PAIN",
  "BUYING_SIGNAL",
  "EVIDENCE",
]

export type MeetingMatch = {
  opportunityId: string | null
  companyId: string | null
  contactId: string | null
  /** Por onde o vinculo foi encontrado. */
  via: "opportunity" | "contact" | "company" | null
}

type OpportunityCandidate = { id: string; companyId: string | null; contactId: string | null }

/**
 * Liga a reuniao ao CRM, nesta ordem: negociacao informada pelo SALE-IA, contato
 * pelo e-mail de um participante, empresa pelo nome. Sem negociacao informada,
 * so liga uma negociacao quando a empresa tem exatamente uma em andamento.
 * Recebe apenas candidatos ja filtrados pela organizacao.
 */
export function matchMeeting(input: {
  opportunity: OpportunityCandidate | null
  contacts: { id: string; companyId: string | null }[]
  company: { id: string } | null
  openOpportunitiesOf: (companyId: string) => OpportunityCandidate[]
}): MeetingMatch {
  if (input.opportunity) {
    return {
      opportunityId: input.opportunity.id,
      companyId: input.opportunity.companyId,
      contactId: input.opportunity.contactId,
      via: "opportunity",
    }
  }

  // Contatos de empresas diferentes deixam a empresa indefinida.
  const contactCompanies = new Set(input.contacts.map((contact) => contact.companyId).filter(Boolean))
  const contact = input.contacts[0] ?? null
  const contactCompany = contactCompanies.size === 1 ? ([...contactCompanies][0] as string) : null

  const companyId = contactCompany ?? (contactCompanies.size === 0 ? (input.company?.id ?? null) : null)
  const via = contact ? "contact" : companyId ? "company" : null

  const open = companyId ? input.openOpportunitiesOf(companyId) : []
  const opportunity = open.length === 1 ? open[0] : null

  return {
    opportunityId: opportunity?.id ?? null,
    companyId,
    contactId: contact?.id ?? opportunity?.contactId ?? null,
    via,
  }
}

/** E-mails normalizados e sem repeticao. */
export function participantEmails(participants: { email?: string | null }[]): string[] {
  return [
    ...new Set(
      participants
        .map((participant) => participant.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email))
    ),
  ]
}

export function sortInsights<T extends { kind: InsightKind; position: number }>(insights: T[]): T[] {
  return [...insights].sort(
    (a, b) => INSIGHT_ORDER.indexOf(a.kind) - INSIGHT_ORDER.indexOf(b.kind) || a.position - b.position
  )
}

// ─── Decisoes sobre os insights (V2-7.3) ─────────────────────────────────────

export type InsightStatus = "OPEN" | "ACCEPTED" | "DISMISSED"
export type InsightAction = "accept" | "dismiss" | "reopen"

/** So recomendacao e etapa sugerida pedem decisao; o resto e informacao. */
export const ACTIONABLE_KINDS: InsightKind[] = ["RECOMMENDATION", "STAGE_SUGGESTION"]

export function isActionable(kind: InsightKind): boolean {
  return ACTIONABLE_KINDS.includes(kind)
}

export type InsightDecision =
  | { ok: true; from: InsightStatus; to: InsightStatus }
  | { ok: false; status: 409 | 422; error: string }

/**
 * Aceitar ou descartar vale para insight em aberto; descartado pode voltar a
 * ficar em aberto. Aceito e definitivo: a atividade ou a etapa ja foram aplicadas.
 */
export function planInsightDecision(input: { kind: InsightKind; status: InsightStatus; action: InsightAction }): InsightDecision {
  const { kind, status, action } = input
  if (!isActionable(kind)) {
    return { ok: false, status: 422, error: "Este insight e informativo e nao pede decisao." }
  }
  if (action === "reopen") {
    return status === "DISMISSED"
      ? { ok: true, from: status, to: "OPEN" }
      : { ok: false, status: 409, error: "So um insight descartado pode ser reaberto." }
  }
  if (status !== "OPEN") {
    return { ok: false, status: 409, error: "Este insight ja foi decidido." }
  }
  return { ok: true, from: status, to: action === "accept" ? "ACCEPTED" : "DISMISSED" }
}

/** Compara nomes de etapa sem acento, maiusculas nem espacos repetidos ("Negociacao" = "Negociação"). */
export function normalizeStageName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export type StageSuggestionState =
  | { state: "no-opportunity" | "closed" | "missing" }
  | { state: "current" | "forward" | "backward"; stageId: string; stageName: string }

/**
 * Onde a etapa sugerida cai no funil da negociacao ligada a reuniao. Etapas
 * arquivadas nao contam como destino.
 */
export function stageSuggestionState(input: {
  suggested: string | null
  opportunity: { status: string; stageId: string } | null
  stages: { id: string; name: string; position: number; archived: boolean }[]
}): StageSuggestionState {
  const { opportunity, stages } = input
  if (!opportunity) return { state: "no-opportunity" }
  if (opportunity.status !== "OPEN") return { state: "closed" }

  const wanted = normalizeStageName(input.suggested ?? "")
  const target = wanted ? stages.find((stage) => !stage.archived && normalizeStageName(stage.name) === wanted) : undefined
  if (!target) return { state: "missing" }

  const current = stages.find((stage) => stage.id === opportunity.stageId)
  const state =
    target.id === opportunity.stageId
      ? "current"
      : current && target.position < current.position
        ? "backward"
        : "forward"
  return { state, stageId: target.id, stageName: target.name }
}

export const STAGE_STATE_MESSAGES: Record<StageSuggestionState["state"], string> = {
  "no-opportunity": "A reunião não está ligada a uma negociação.",
  closed: "A negociação está encerrada.",
  missing: "O funil da negociação não tem esta etapa.",
  current: "A negociação já está nesta etapa.",
  forward: "Avança a negociação no funil.",
  backward: "Volta a negociação para uma etapa anterior.",
}

// ─── "So diagnostico" (V2-8.2) ───────────────────────────────────────────────

export type DiagnosisStatus = "PENDING" | "CONFIRMED" | "CONTESTED"
export type DiagnosisAction = "confirm" | "contest" | "reopen"

/**
 * Situacao do "so diagnostico" ao (re)receber a analise. A decisao de uma pessoa
 * (confirmada ou contestada) nunca e trocada pela IA; sem decisao, segue a analise.
 */
export function diagnosisStatusOnIngest(input: {
  offerPresented: boolean | null
  current: DiagnosisStatus | null
}): DiagnosisStatus | null {
  if (input.current === "CONFIRMED" || input.current === "CONTESTED") return input.current
  return input.offerPresented === false ? "PENDING" : null
}

export type DiagnosisDecision =
  | { ok: true; from: DiagnosisStatus; to: DiagnosisStatus }
  | { ok: false; status: 409 | 422; error: string }

/**
 * Confirmar (com o motivo, sugerido ou reescrito) ou contestar valem para o
 * que falta confirmar; reabrir desfaz qualquer uma das duas.
 */
export function planDiagnosisDecision(input: {
  offerPresented: boolean | null
  status: DiagnosisStatus | null
  action: DiagnosisAction
}): DiagnosisDecision {
  const { status, action } = input
  if (input.offerPresented !== false || status === null) {
    return { ok: false, status: 422, error: "A análise desta reunião não indica só diagnóstico." }
  }
  if (action === "reopen") {
    return status === "PENDING"
      ? { ok: false, status: 409, error: "Esta reunião ainda não foi decidida." }
      : { ok: true, from: status, to: "PENDING" }
  }
  if (status !== "PENDING") return { ok: false, status: 409, error: "Esta reunião já foi decidida." }
  return { ok: true, from: status, to: action === "confirm" ? "CONFIRMED" : "CONTESTED" }
}

/**
 * Numeros do cartao "So diagnostico": contam as reunioes em que a oferta nao
 * foi apresentada, menos as contestadas; "sem analise" = reunioes sem avaliacao.
 */
export function diagnosisSummary(
  meetings: { offerPresented: boolean | null; diagnosisStatus: DiagnosisStatus | null }[]
): { count: number; pending: number; unevaluated: number } {
  let count = 0
  let pending = 0
  let unevaluated = 0
  for (const meeting of meetings) {
    if (meeting.offerPresented === null) unevaluated++
    if (meeting.offerPresented !== false || meeting.diagnosisStatus === "CONTESTED") continue
    count++
    if (meeting.diagnosisStatus !== "CONFIRMED") pending++
  }
  return { count, pending, unevaluated }
}

export const ACTIVITY_TITLE_MAX = 160
const ACTIVITY_DESCRIPTION_MAX = 2000

/**
 * Atividade criada ao aceitar uma recomendacao: tarefa com o prazo sugerido,
 * titulo com o texto (cortado se preciso) e a origem na descricao.
 */
export function recommendationActivity(input: {
  text: string
  quote: string | null
  dueDate: Date | null
  meetingTitle: string
  meetingDate: string
}): { type: "TASK"; title: string; description: string; dueDate: Date | null } {
  const text = input.text.replace(/\s+/g, " ").trim()
  const cut = text.length > ACTIVITY_TITLE_MAX
  const title = cut ? `${text.slice(0, ACTIVITY_TITLE_MAX - 1).trimEnd()}…` : text

  const lines = [`Recomendação da reunião "${input.meetingTitle}" (SALEIA, ${input.meetingDate}).`]
  if (cut) lines.push("", text)
  if (input.quote) lines.push("", `Trecho: "${input.quote.trim()}"`)
  const description = lines.join("\n")

  return {
    type: "TASK",
    title,
    description:
      description.length > ACTIVITY_DESCRIPTION_MAX
        ? `${description.slice(0, ACTIVITY_DESCRIPTION_MAX - 1)}…`
        : description,
    dueDate: input.dueDate,
  }
}
