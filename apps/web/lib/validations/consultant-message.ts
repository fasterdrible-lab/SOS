import { z } from "zod"

export const consultantMessageInputSchema = z.object({
  content: z.string().trim().min(1, "Mensagem vazia.").max(4000),
})

export type ConsultantMessageInput = z.infer<typeof consultantMessageInputSchema>
