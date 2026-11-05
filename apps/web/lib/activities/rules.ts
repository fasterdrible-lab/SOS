// Regras das atividades. Puras: consultas e gravacao ficam em service.ts e nas rotas.

export const ACTIVITY_TYPES = ["MEETING", "FOLLOW_UP", "CALL", "EMAIL", "TASK", "NOTE"] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  MEETING: "Reunião",
  FOLLOW_UP: "Follow-up",
  CALL: "Ligação",
  EMAIL: "E-mail",
  TASK: "Tarefa",
  NOTE: "Nota",
}

/** Reuniao e follow-up so fazem sentido com data. */
export function requiresDueDate(type: ActivityType): boolean {
  return type === "MEETING" || type === "FOLLOW_UP"
}

/** Nota e um registro do que aconteceu: ja nasce concluida. */
export function completesOnCreate(type: ActivityType): boolean {
  return type === "NOTE"
}

export type ActivityBucket = "overdue" | "today" | "upcoming" | "unscheduled" | "done"

export const ACTIVITY_BUCKETS: { key: ActivityBucket; label: string }[] = [
  { key: "overdue", label: "Atrasadas" },
  { key: "today", label: "Hoje" },
  { key: "upcoming", label: "Próximas" },
  { key: "unscheduled", label: "Sem data" },
  { key: "done", label: "Concluídas" },
]

export function activityBucket(
  activity: { dueDate: Date | null; completedAt: Date | null },
  today: { start: Date; end: Date }
): ActivityBucket {
  if (activity.completedAt) return "done"
  if (!activity.dueDate) return "unscheduled"
  if (activity.dueDate < today.start) return "overdue"
  return activity.dueDate < today.end ? "today" : "upcoming"
}

export type ActivityLinks =
  | { ok: true; companyId: string | null; contactId: string | null }
  | { ok: false; error: string }

/**
 * Empresa e contato vem da negociacao ou do contato quando nao informados. Os
 * tres precisam apontar para a mesma empresa.
 */
export function resolveActivityLinks(input: {
  companyId: string | null
  contactId: string | null
  contact: { companyId: string | null } | null
  opportunity: { companyId: string | null; contactId: string | null } | null
}): ActivityLinks {
  const { contact, opportunity } = input
  const companies = new Set(
    [input.companyId, contact?.companyId, opportunity?.companyId].filter((id): id is string => Boolean(id))
  )

  if (companies.size > 1) {
    return { ok: false, error: "A atividade liga empresas diferentes." }
  }

  return {
    ok: true,
    companyId: [...companies][0] ?? null,
    contactId: input.contactId ?? opportunity?.contactId ?? null,
  }
}

export type ActivityStatusFilter = "pendentes" | "concluidas"
export type ActivityView = "lista" | "agenda"

export interface ActivityFilters {
  status: ActivityStatusFilter
  view: ActivityView
  /** "todos", "meus", "sem-dono" ou o id de um membro. */
  owner: string
  type: ActivityType | null
  /** Semanas a partir da atual, na agenda. */
  week: number
}

type Raw = string | string[] | undefined

const single = (value: Raw) => (Array.isArray(value) ? value[0] : value)
const MAX_WEEK_OFFSET = 104

export function parseActivityFilters(query: Record<string, Raw>): ActivityFilters {
  const type = single(query.tipo)
  const week = Number(single(query.semana))
  return {
    status: single(query.status) === "concluidas" ? "concluidas" : "pendentes",
    view: single(query.visao) === "agenda" ? "agenda" : "lista",
    owner: single(query.dono) || "todos",
    type: ACTIVITY_TYPES.includes(type as ActivityType) ? (type as ActivityType) : null,
    week: Number.isInteger(week) && Math.abs(week) <= MAX_WEEK_OFFSET ? week : 0,
  }
}

/** URL com os filtros, sem os valores padrao. */
export function activitiesHref(filters: ActivityFilters, change: Partial<ActivityFilters> = {}): string {
  const next = { ...filters, ...change }
  const params = new URLSearchParams()
  if (next.status !== "pendentes") params.set("status", next.status)
  if (next.view !== "lista") params.set("visao", next.view)
  if (next.owner !== "todos") params.set("dono", next.owner)
  if (next.type) params.set("tipo", next.type)
  if (next.week !== 0) params.set("semana", String(next.week))
  const text = params.toString()
  return text ? `/atividades?${text}` : "/atividades"
}
