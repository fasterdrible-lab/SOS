import { calculateMaturityPillars, MaturityScoreInput } from "./maturity"

const PILLAR_THRESHOLD = 0.5

export interface DiagnosticInsight {
  title: string
  detail: string
}

export function generateBottlenecks(input: MaturityScoreInput): DiagnosticInsight[] {
  const pillars = calculateMaturityPillars(input)
  const bottlenecks: DiagnosticInsight[] = []

  if (pillars.crm === 0) {
    bottlenecks.push({
      title: "Ausencia de CRM estruturado",
      detail:
        "Sem um CRM em uso, o time perde visibilidade do funil e do historico de contato com os leads.",
    })
  }

  if (pillars.process < PILLAR_THRESHOLD) {
    bottlenecks.push({
      title: "Processo comercial pouco documentado",
      detail:
        "A descricao do processo atual e curta, indicando falta de padronizacao nas etapas de venda.",
    })
  }

  if (pillars.conversion < PILLAR_THRESHOLD) {
    bottlenecks.push({
      title: "Taxa de conversao abaixo do esperado",
      detail: `Conversao atual de ${input.conversionRate}% esta abaixo do benchmark de mercado (25%).`,
    })
  }

  if (pillars.leads < PILLAR_THRESHOLD) {
    bottlenecks.push({
      title: "Volume de leads por vendedor insuficiente",
      detail: `Media de ${pillars.leadsPerSeller.toFixed(1)} leads/vendedor/mes, abaixo do benchmark de 50.`,
    })
  }

  return bottlenecks
}

export function generateRecommendations(input: MaturityScoreInput): DiagnosticInsight[] {
  const pillars = calculateMaturityPillars(input)
  const recommendations: DiagnosticInsight[] = []

  if (pillars.crm === 0) {
    recommendations.push({
      title: "Implementar um CRM",
      detail: "Adotar uma ferramenta de CRM para centralizar leads, oportunidades e follow-ups.",
    })
  }

  if (pillars.process < PILLAR_THRESHOLD) {
    recommendations.push({
      title: "Documentar o processo comercial",
      detail:
        "Formalizar as etapas do funil (prospeccao, qualificacao, proposta, fechamento) em um playbook.",
    })
  }

  if (pillars.conversion < PILLAR_THRESHOLD) {
    recommendations.push({
      title: "Revisar a qualificacao de leads",
      detail: "Investir em criterios de qualificacao (ex: ICP, BANT) para elevar a taxa de conversao.",
    })
  }

  if (pillars.leads < PILLAR_THRESHOLD) {
    recommendations.push({
      title: "Aumentar a geracao de leads",
      detail: "Ampliar canais de aquisicao ou redistribuir a carteira para elevar leads por vendedor.",
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Manter a operacao e buscar escala",
      detail: "Os indicadores atuais estao saudaveis; foco em escalar volume mantendo os padroes atuais.",
    })
  }

  return recommendations
}
