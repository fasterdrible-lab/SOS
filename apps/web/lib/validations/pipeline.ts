import { z } from "zod"

import { MAX_STAGES } from "@/lib/pipelines/defaults"

export const pipelineStageInputSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1, "Informe o nome da etapa.").max(60),
  probability: z.coerce.number().int().min(0).max(100),
  isProposal: z.boolean().default(false),
})

/** O funil inteiro, com as etapas na ordem desejada. */
export const pipelineInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do funil.").max(60),
  stages: z
    .array(pipelineStageInputSchema)
    .min(1, "O funil precisa de ao menos uma etapa.")
    .max(MAX_STAGES, `No maximo ${MAX_STAGES} etapas.`),
})

export type PipelineInput = z.infer<typeof pipelineInputSchema>
