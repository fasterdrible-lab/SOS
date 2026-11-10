import { z } from "zod"

/**
 * confirm: confirma o "so diagnostico" com o motivo (o sugerido pela IA ou reescrito)
 * | contest: a oferta foi apresentada | reopen: desfaz a decisao.
 */
export const saleiaDiagnosisDecisionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm"), reason: z.string().trim().min(1, "Informe o motivo.").max(2000) }),
  z.object({ action: z.literal("contest") }),
  z.object({ action: z.literal("reopen") }),
])
