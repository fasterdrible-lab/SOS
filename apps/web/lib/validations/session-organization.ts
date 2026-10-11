import { z } from "zod"

export const sessionOrganizationInputSchema = z.object({
  organizationId: z.string().trim().min(1, "Organizacao invalida."),
})

export type SessionOrganizationInput = z.infer<typeof sessionOrganizationInputSchema>
