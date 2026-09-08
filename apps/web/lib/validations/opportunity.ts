import { z } from "zod"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

export const OPPORTUNITY_STAGES = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const

export const opportunityInputSchema = z.object({
  title: z.string().trim().min(2, "Informe o titulo da oportunidade.").max(160),
  value: z.coerce.number().min(0).max(1000000000),
  companyId: optionalText(40),
  contactId: optionalText(40),
  expectedClose: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine(
      (value) => value === undefined || !Number.isNaN(Date.parse(value)),
      "Data invalida."
    ),
  notes: optionalText(2000),
})

export type OpportunityInput = z.infer<typeof opportunityInputSchema>

export const opportunityStageUpdateSchema = z.object({
  stage: z.enum(OPPORTUNITY_STAGES),
})
