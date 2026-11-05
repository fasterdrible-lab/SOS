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

/** Texto vazio limpa o campo: a edicao envia sempre o cadastro inteiro. */
const clearableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .default(null)
    .transform((value) => value || null)

const clearableEmail = z
  .string()
  .trim()
  .email("Email invalido.")
  .max(160)
  .nullable()
  .or(z.literal(""))
  .default(null)
  .transform((value) => value || null)

export const companyEditSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa.").max(120),
  segment: clearableText(80),
  website: clearableText(200),
  phone: clearableText(30),
  email: clearableEmail,
})
