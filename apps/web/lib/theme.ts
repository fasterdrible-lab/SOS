export type Theme = "dark" | "light"

/** Cookie lido no servidor: a pagina ja chega no tema certo, sem piscar. */
export const THEME_COOKIE = "salesos-theme"
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** O escuro e a identidade da marca; o claro vale so quando escolhido. */
export function parseTheme(value: string | null | undefined): Theme {
  return value === "light" ? "light" : "dark"
}
