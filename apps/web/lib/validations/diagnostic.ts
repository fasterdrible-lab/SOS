import { z } from "zod"

const requiredText = (min: number, max: number) =>
  z.string().trim().min(min).max(max)

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

export const diagnosticInputSchema = z.object({
  companyName: requiredText(2, 120),
  segment: requiredText(2, 80),
  revenue: requiredText(2, 80),
  sellers: z.coerce.number().int().min(1).max(10000),
  monthlyLeads: z.coerce.number().int().min(0).max(1000000),
  averageTicket: z.coerce.number().min(0).max(1000000000),
  conversionRate: z.coerce.number().min(0).max(100),
  crmUsed: optionalText(80),
  commercialProcess: requiredText(10, 2000),
  painPoints: requiredText(10, 2000),
})

export type DiagnosticInput = z.infer<typeof diagnosticInputSchema>
