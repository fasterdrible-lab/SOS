import { z } from "zod"

export const API_PROVIDERS = ["ANTHROPIC", "OPENAI"] as const

export const apiIntegrationInputSchema = z.object({
  provider: z.enum(API_PROVIDERS),
  apiKey: z.string().trim().min(10, "Chave de API invalida.").max(300),
})

export type ApiIntegrationInput = z.infer<typeof apiIntegrationInputSchema>

export const apiIntegrationDeleteSchema = z.object({
  provider: z.enum(API_PROVIDERS),
})
