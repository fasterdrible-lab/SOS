import { z } from "zod"

import { OPPORTUNITY_STATUSES } from "@/lib/opportunities/rules"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

export const opportunityInputSchema = z.object({
  title: z.string().trim().min(2, "Informe o titulo da oportunidade.").max(160),
  value: z.coerce.number().min(0).max(1000000000),
  companyId: optionalText(40),
  contactId: optionalText(40),
  /** Etapa inicial; sem ela, a primeira do funil padrao. */
  stageId: optionalText(80),
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

/** Texto vazio remove o vinculo: a API distingue nulo (limpar) de ausente (manter). */
const clearableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null))

export const opportunityEditSchema = z.object({
  title: z.string().trim().min(2, "Informe o titulo da oportunidade.").max(160).optional(),
  value: z.coerce.number().min(0).max(1000000000).optional(),
  companyId: clearableText(40),
  contactId: clearableText(40),
  ownerId: clearableText(40),
  expectedClose: clearableText(40).refine(
    (value) => value === undefined || value === null || !Number.isNaN(Date.parse(value)),
    "Data invalida."
  ),
  notes: clearableText(2000),
})

export const opportunityChangeSchema = z
  .object({
    stageId: optionalText(80),
    status: z.enum(OPPORTUNITY_STATUSES).optional(),
    lostReason: optionalText(500),
  })
  .refine((value) => value.stageId !== undefined || value.status !== undefined, {
    message: "Informe a etapa ou o status.",
    path: ["stageId"],
  })
