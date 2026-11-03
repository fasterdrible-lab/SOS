// Agregacoes puras do Dashboard Executivo. As consultas ficam em executive.ts.

const round1 = (value: number) => Math.round(value * 10) / 10
const round2 = (value: number) => Math.round(value * 100) / 100

/** Id do ultimo degrau do funil, alem das etapas: a venda. */
export const WON_STEP_ID = "WON"

export interface FunnelStep {
  /** Id da etapa, ou WON_STEP_ID. */
  id: string
  name: string
  /** Negociacoes que chegaram a esta etapa, ou a uma posterior, no periodo. */
  count: number
  /** Percentual da etapa de cima; nulo na primeira ou com a de cima vazia. */
  percentOfPrevious: number | null
}

/**
 * Funil a partir das entradas de historico do periodo, nas etapas de um funil
 * (em ordem). Uma negociacao que pulou etapas conta em todas as anteriores a
 * mais alta que alcancou; ganhar conta como o degrau final; perder conta so a
 * etapa em que estava; etapas de outros funis sao ignoradas.
 */
export function buildFunnel(
  entries: { opportunityId: string; toStageId: string; toStatus: string }[],
  stages: { id: string; name: string }[]
): FunnelStep[] {
  const indexById = new Map(stages.map((stage, index) => [stage.id, index]))
  const highest = new Map<string, number>()
  for (const { opportunityId, toStageId, toStatus } of entries) {
    const stageIndex = indexById.get(toStageId)
    if (stageIndex === undefined) continue
    const index = toStatus === "WON" ? stages.length : stageIndex
    highest.set(opportunityId, Math.max(highest.get(opportunityId) ?? -1, index))
  }

  const reached = [...highest.values()]
  const steps = [...stages, { id: WON_STEP_ID, name: "Ganha" }]
  return steps.map((step, index) => {
    const count = reached.filter((top) => top >= index).length
    const above = index === 0 ? 0 : reached.filter((top) => top >= index - 1).length
    return {
      id: step.id,
      name: step.name,
      count,
      percentOfPrevious: index === 0 || above === 0 ? null : round1((count / above) * 100),
    }
  })
}

export interface RankedGroup {
  label: string
  count: number
  value: number
  /** Percentual da quantidade total. */
  share: number
}

export interface RankedGroups {
  total: { count: number; value: number }
  groups: RankedGroup[]
  /** Soma dos grupos alem dos primeiros; nulo quando nao ha. */
  others: { groupCount: number; count: number; value: number; share: number } | null
}

/**
 * Agrupa por texto livre (origem do lead, motivo da perda), sem diferenciar
 * maiusculas nem espacos extras, do mais frequente para o menos.
 */
export function rankGroups(
  items: { key: string | null | undefined; value: number }[],
  options: { top: number; emptyLabel: string }
): RankedGroups {
  const byKey = new Map<string, RankedGroup>()
  for (const item of items) {
    const label = item.key?.replace(/\s+/g, " ").trim() || options.emptyLabel
    const key = label.toLocaleLowerCase("pt-BR")
    const group = byKey.get(key) ?? { label, count: 0, value: 0, share: 0 }
    group.count += 1
    group.value += item.value
    byKey.set(key, group)
  }

  const total = { count: items.length, value: round2(items.reduce((sum, item) => sum + item.value, 0)) }
  const share = (count: number) => (total.count === 0 ? 0 : round1((count / total.count) * 100))
  const sorted = [...byKey.values()]
    .map((group) => ({ ...group, value: round2(group.value), share: share(group.count) }))
    .sort((a, b) => b.count - a.count || b.value - a.value || a.label.localeCompare(b.label, "pt-BR"))

  const rest = sorted.slice(options.top)
  const restCount = rest.reduce((sum, group) => sum + group.count, 0)
  return {
    total,
    groups: sorted.slice(0, options.top),
    others:
      rest.length === 0
        ? null
        : {
            groupCount: rest.length,
            count: restCount,
            value: round2(rest.reduce((sum, group) => sum + group.value, 0)),
            share: share(restCount),
          },
  }
}

export interface TeamRow {
  /** Nulo: negociacoes sem responsavel. */
  userId: string | null
  name: string
  won: number
  lost: number
  revenue: number
  averageTicket: number | null
  /** Ganhas sobre encerradas no periodo. */
  conversionRate: number | null
  /** Faturamento do mes corrente sobre a meta do mes; nulo sem meta. */
  goalPercent: number | null
}

export function buildTeamRows(input: {
  members: { userId: string; name: string }[]
  won: { ownerId: string | null; value: number }[]
  lost: { ownerId: string | null }[]
  monthRevenue: Map<string, number>
  goals: Map<string, number>
}): TeamRow[] {
  const rows = new Map<string | null, TeamRow>()
  const rowFor = (userId: string | null) => {
    let row = rows.get(userId)
    if (!row) {
      const member = input.members.find((item) => item.userId === userId)
      row = {
        userId,
        name: userId === null ? "Sem responsável" : (member?.name ?? "Ex-membro"),
        won: 0,
        lost: 0,
        revenue: 0,
        averageTicket: null,
        conversionRate: null,
        goalPercent: null,
      }
      rows.set(userId, row)
    }
    return row
  }

  for (const sale of input.won) {
    const row = rowFor(sale.ownerId)
    row.won += 1
    row.revenue += sale.value
  }
  for (const loss of input.lost) rowFor(loss.ownerId).lost += 1
  for (const userId of input.goals.keys()) rowFor(userId)

  return [...rows.values()]
    .map((row) => {
      const goal = row.userId === null ? undefined : input.goals.get(row.userId)
      const monthRevenue = row.userId === null ? 0 : (input.monthRevenue.get(row.userId) ?? 0)
      return {
        ...row,
        revenue: round2(row.revenue),
        averageTicket: row.won === 0 ? null : round2(row.revenue / row.won),
        conversionRate: row.won + row.lost === 0 ? null : round1((row.won / (row.won + row.lost)) * 100),
        goalPercent: goal ? round1((monthRevenue / goal) * 100) : null,
      }
    })
    .sort((a, b) => b.revenue - a.revenue || b.won - a.won || a.name.localeCompare(b.name, "pt-BR"))
}

/** Media de dias entre a criacao e o ganho. */
export function averageCycleDays(sales: { createdAt: Date; wonAt: Date }[]): number | null {
  if (sales.length === 0) return null
  const total = sales.reduce(
    (sum, sale) => sum + Math.max(0, sale.wonAt.getTime() - sale.createdAt.getTime()),
    0
  )
  return round1(total / sales.length / 86_400_000)
}
