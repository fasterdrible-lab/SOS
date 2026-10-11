import { z } from "zod"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

export const sdrStartConversationSchema = z.object({
  leadName: optionalText(120),
  leadEmail: z
    .string()
    .trim()
    .email("Email invalido.")
    .max(160)
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  leadPhone: optionalText(40),
})

export type SdrStartConversationInput = z.infer<typeof sdrStartConversationSchema>

export const sdrMessageInputSchema = z.object({
  content: z.string().trim().min(1, "Mensagem vazia.").max(2000),
})

export type SdrMessageInput = z.infer<typeof sdrMessageInputSchema>
