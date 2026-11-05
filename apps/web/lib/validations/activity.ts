import { z } from "zod"

import { ACTIVITY_TYPES } from "@/lib/activities/rules"

/** Ausente mantem; vazio ou nulo limpa. */
const clearableId = z
  .string()
  .trim()
  .max(80)
  .nullable()
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null))

const clearableDate = z
  .string()
  .trim()
  .max(40)
  .nullable()
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null))
  .refine(
    (value) => value === undefined || value === null || !Number.isNaN(Date.parse(value)),
    "Data invalida."
  )

const fields = {
  dueDate: clearableDate,
  description: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null)),
  ownerId: clearableId,
  companyId: clearableId,
  contactId: clearableId,
  opportunityId: clearableId,
}

export const activityInputSchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  title: z.string().trim().min(2, "Informe o titulo da atividade.").max(160),
  ...fields,
})

export const activityUpdateSchema = z.object({
  type: z.enum(ACTIVITY_TYPES).optional(),
  title: z.string().trim().min(2, "Informe o titulo da atividade.").max(160).optional(),
  completed: z.boolean().optional(),
  ...fields,
})
