import { z } from "zod"

export const organizationInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da organizacao.").max(120),
})

export type OrganizationInput = z.infer<typeof organizationInputSchema>
