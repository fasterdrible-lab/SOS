import { z } from "zod"

import { ASSIGNABLE_ROLES } from "@/lib/members/rules"

export const inviteCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  role: z.enum(ASSIGNABLE_ROLES),
})

/** Papel e/ou equipe (`teamId` nulo tira da equipe); pelo menos um dos dois. */
export const memberUpdateSchema = z
  .object({
    role: z.enum(ASSIGNABLE_ROLES).optional(),
    teamId: z.string().min(1).max(60).nullable().optional(),
  })
  .refine((data) => data.role !== undefined || data.teamId !== undefined, {
    message: "Informe o papel ou a equipe.",
  })

export const teamNameSchema = z.object({
  name: z.string().trim().min(2).max(60),
})

/** Conta nova: nome e senha. Conta existente: so a senha atual, para provar que e a dona. */
export const inviteAcceptSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  password: z.string().min(1).max(200),
})

export const NEW_PASSWORD_MIN = 12
