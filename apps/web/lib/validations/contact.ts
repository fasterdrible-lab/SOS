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
