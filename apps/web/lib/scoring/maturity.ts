const CRM_WEIGHT = 20
const PROCESS_WEIGHT = 25
const CONVERSION_WEIGHT = 30
const LEADS_WEIGHT = 25

const CONVERSION_RATE_BENCHMARK = 25
const LEADS_PER_SELLER_BENCHMARK = 50
const PROCESS_LENGTH_BENCHMARK = 300

export interface MaturityScoreInput {
  sellers: number
  monthlyLeads: number
  conversionRate: number
  crmUsed?: string
  commercialProcess: string
}

export interface MaturityPillars {
  crm: number
  process: number
  conversion: number
  leads: number
  leadsPerSeller: number
}

function ratio(value: number, benchmark: number): number {
  return Math.min(Math.max(value / benchmark, 0), 1)
}

export function calculateMaturityPillars(input: MaturityScoreInput): MaturityPillars {
  const crm = input.crmUsed && input.crmUsed.trim().length > 0 ? 1 : 0
  const process = ratio(input.commercialProcess.trim().length, PROCESS_LENGTH_BENCHMARK)
  const conversion = ratio(input.conversionRate, CONVERSION_RATE_BENCHMARK)
  const leadsPerSeller = input.monthlyLeads / input.sellers
  const leads = ratio(leadsPerSeller, LEADS_PER_SELLER_BENCHMARK)

  return { crm, process, conversion, leads, leadsPerSeller }
}

export function calculateMaturityScore(input: MaturityScoreInput): number {
  const pillars = calculateMaturityPillars(input)

  const total =
    pillars.crm * CRM_WEIGHT +
    pillars.process * PROCESS_WEIGHT +
    pillars.conversion * CONVERSION_WEIGHT +
    pillars.leads * LEADS_WEIGHT

  return Math.round(Math.min(Math.max(total, 0), 100))
}
