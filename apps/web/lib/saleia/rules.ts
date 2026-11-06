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
