import { z } from "zod"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

export const companyInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa.").max(120),
  segment: optionalText(80),
  website: optionalText(200),
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .email("Email invalido.")
    .max(160)
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
})

export type CompanyInput = z.infer<typeof companyInputSchema>
