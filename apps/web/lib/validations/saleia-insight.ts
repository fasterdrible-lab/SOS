import { z } from "zod"

/** accept: cria a atividade ou aplica a etapa | dismiss: descarta | reopen: desfaz o descarte. */
export const saleiaInsightDecisionSchema = z.object({
  action: z.enum(["accept", "dismiss", "reopen"]),
})
