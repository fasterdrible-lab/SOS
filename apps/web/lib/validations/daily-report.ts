import { z } from "zod"

export const dailyReportCloseSchema = z.object({
  /** AAAA-MM-DD; ausente = hoje. */
  day: z.string().trim().max(10).optional(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .transform((value) => value || null),
})
