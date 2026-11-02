export const SEARCH_MIN_LENGTH = 2
export const SEARCH_MAX_LENGTH = 80
export const SEARCH_RESULTS_PER_GROUP = 5

/** Termo pronto para buscar, ou nulo se curto demais. Espacos repetidos viram um. */
export function normalizeSearchTerm(raw: string | null | undefined): string | null {
  const term = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_LENGTH).trim()
  return term.length >= SEARCH_MIN_LENGTH ? term : null
}
