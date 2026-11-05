import { z } from "zod"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

export const contactInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do contato.").max(120),
  companyId: optionalText(40),
  role: optionalText(80),
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

export type ContactInput = z.infer<typeof contactInputSchema>

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

export const contactEditSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do contato.").max(120),
  companyId: clearableText(40),
  role: clearableText(80),
  phone: clearableText(30),
  email: clearableEmail,
})
