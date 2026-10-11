const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g")

export function slugifyOrganizationName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  return base || "organizacao"
}
