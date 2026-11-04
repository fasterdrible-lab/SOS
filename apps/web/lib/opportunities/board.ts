// Filtros de /pipeline, guardados na URL. Regra pura: a consulta fica na pagina.

export type BoardStatusKey = "abertas" | "ganhas" | "perdidas" | "todas"
export type BoardSortKey = "recentes" | "valor" | "fechamento" | "parados"
export type BoardView = "quadro" | "lista"
/** "todos", "meus", "sem-dono" ou o id de um membro. */
export type BoardOwner = string

export const BOARD_LIMIT = 500
const MAX_QUERY_LENGTH = 80

export const BOARD_STATUSES: { key: BoardStatusKey; label: string; statuses: ("OPEN" | "WON" | "LOST")[] }[] = [
  { key: "abertas", label: "Em andamento", statuses: ["OPEN"] },
  { key: "ganhas", label: "Ganhas", statuses: ["WON"] },
  { key: "perdidas", label: "Perdidas", statuses: ["LOST"] },
  { key: "todas", label: "Todas", statuses: ["OPEN", "WON", "LOST"] },
]

export const BOARD_SORTS: { key: BoardSortKey; label: string }[] = [
  { key: "recentes", label: "Criadas por último" },
  { key: "valor", label: "Maior valor" },
  { key: "fechamento", label: "Fechamento mais próximo" },
  { key: "parados", label: "Paradas há mais tempo" },
]

export interface BoardFilters {
  /** Vazio: o funil padrao. */
  pipelineId: string
  status: BoardStatusKey
  sort: BoardSortKey
  view: BoardView
  owner: BoardOwner
  query: string
}

type Raw = string | string[] | undefined

const single = (value: Raw) => (Array.isArray(value) ? value[0] : value)

function oneOf<T extends string>(value: string | undefined, keys: readonly T[], fallback: T): T {
  return keys.includes(value as T) ? (value as T) : fallback
}

export function parseBoardFilters(query: Record<string, Raw>): BoardFilters {
  return {
    pipelineId: single(query.funil) ?? "",
    status: oneOf(single(query.status), BOARD_STATUSES.map((item) => item.key), "abertas"),
    sort: oneOf(single(query.ordem), BOARD_SORTS.map((item) => item.key), "recentes"),
    view: oneOf(single(query.visao), ["quadro", "lista"] as const, "quadro"),
    owner: single(query.dono) || "todos",
    query: (single(query.q) ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH),
  }
}

/** URL com os filtros, sem os valores padrao. */
export function boardHref(filters: BoardFilters, change: Partial<BoardFilters> = {}): string {
  const next = { ...filters, ...change }
  const params = new URLSearchParams()
  if (next.pipelineId) params.set("funil", next.pipelineId)
  if (next.status !== "abertas") params.set("status", next.status)
  if (next.owner !== "todos") params.set("dono", next.owner)
  if (next.sort !== "recentes") params.set("ordem", next.sort)
  if (next.view !== "quadro") params.set("visao", next.view)
  if (next.query) params.set("q", next.query)
  const text = params.toString()
  return text ? `/pipeline?${text}` : "/pipeline"
}

/** Filtro de dono para o Prisma. Vendedor ja vem limitado pelo escopo do papel. */
export function ownerWhere(owner: BoardOwner, userId: string): { ownerId?: string | null } {
  if (owner === "todos") return {}
  if (owner === "meus") return { ownerId: userId }
  if (owner === "sem-dono") return { ownerId: null }
  return { ownerId: owner }
}
