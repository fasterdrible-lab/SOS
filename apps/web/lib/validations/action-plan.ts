import { z } from "zod"

export const actionPlanInputSchema = z.object({
  title: z.string().trim().min(2, "Informe o titulo do plano.").max(160),
  objective: z.string().trim().min(2, "Informe o objetivo do plano.").max(500),
})

export type ActionPlanInput = z.infer<typeof actionPlanInputSchema>
