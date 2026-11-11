import { z } from "zod"

import { ASSIGNABLE_ROLES } from "@/lib/members/rules"

export const inviteCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  role: z.enum(ASSIGNABLE_ROLES),
})

export const memberRoleSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES),
})

/** Conta nova: nome e senha. Conta existente: so a senha atual, para provar que e a dona. */
export const inviteAcceptSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  password: z.string().min(1).max(200),
})

export const NEW_PASSWORD_MIN = 12
