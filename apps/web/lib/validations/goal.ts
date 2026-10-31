import { z } from "zod"

export const goalInputSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes invalido (AAAA-MM)."),
  /** Nulo ou ausente: meta da organizacao. */
  userId: z.string().trim().min(1).max(40).nullish(),
  /** Nulo remove a meta. */
  amount: z.coerce.number().min(0.01, "Informe um valor maior que zero.").max(1000000000).nullable(),
})

export type GoalInput = z.infer<typeof goalInputSchema>

export const ORGANIZATION_GOAL_SCOPE = "ORG"
