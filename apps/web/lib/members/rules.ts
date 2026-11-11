// Regra pura, sem imports em tempo de execucao (testada direto pelo Node).

/** Papeis que a tela atribui. OWNER e CONSULTANT continuam valendo como administrador. */
export const ASSIGNABLE_ROLES = ["ADMIN", "MANAGER", "MEMBER"] as const
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Administrador",
  ADMIN: "Administrador",
  CONSULTANT: "Consultor (administrador)",
  MANAGER: "Gestor",
  MEMBER: "Vendedor",
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

export const INVITE_TTL_DAYS = 7

export function inviteExpiry(now: Date): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
}

export type InviteState = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED"

export function inviteState(
  invite: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now: Date
): InviteState {
  if (invite.acceptedAt) return "ACCEPTED"
  if (invite.revokedAt) return "REVOKED"
  if (invite.expiresAt.getTime() <= now.getTime()) return "EXPIRED"
  return "PENDING"
}

export const PASSWORD_RESET_TTL_HOURS = 24

export function passwordResetExpiry(now: Date): Date {
  return new Date(now.getTime() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000)
}

export type PasswordResetState = "PENDING" | "USED" | "REVOKED" | "EXPIRED"

export function passwordResetState(
  reset: { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now: Date
): PasswordResetState {
  if (reset.usedAt) return "USED"
  if (reset.revokedAt) return "REVOKED"
  if (reset.expiresAt.getTime() <= now.getTime()) return "EXPIRED"
  return "PENDING"
}

/**
 * Administrador so redefine a senha de quem pertence apenas a esta organizacao:
 * a conta de quem participa de outras daria acesso a elas tambem.
 */
export function planPasswordReset(input: { membershipCount: number }): MemberPlan {
  if (input.membershipCount > 1) {
    return {
      ok: false,
      code: "UNPROCESSABLE",
      message: "Essa conta participa de outras organizacoes; a senha so pode ser redefinida pelo suporte.",
    }
  }
  return { ok: true }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Os mesmos papeis de nivel ADMIN de lib/authz/permissions.ts (conferido nos testes). */
const ADMIN_ROLES = ["OWNER", "ADMIN", "CONSULTANT"]

export const isAdminRole = (role: string) => ADMIN_ROLES.includes(role)

export type MemberPlan =
  | { ok: true }
  | { ok: false; code: "UNPROCESSABLE" | "CONFLICT"; message: string }

interface MemberTarget {
  actorUserId: string
  targetUserId: string
  currentRole: string
  /** Administradores da organizacao, contando o alvo. */
  adminCount: number
}

/**
 * Troca de papel: ninguem muda o proprio papel (evita se trancar fora) e a
 * organizacao nunca fica sem administrador.
 */
export function planRoleChange(input: MemberTarget & { newRole: string }): MemberPlan {
  if (input.actorUserId === input.targetUserId) {
    return { ok: false, code: "UNPROCESSABLE", message: "Voce nao pode mudar o proprio papel." }
  }
  if (input.currentRole === input.newRole) {
    return { ok: false, code: "CONFLICT", message: "A pessoa ja tem esse papel." }
  }
  if (isAdminRole(input.currentRole) && !isAdminRole(input.newRole) && input.adminCount <= 1) {
    return { ok: false, code: "UNPROCESSABLE", message: "A organizacao precisa de pelo menos um administrador." }
  }
  return { ok: true }
}

/** Remover o vinculo: nunca a si mesmo nem o ultimo administrador. */
export function planRemoval(input: MemberTarget): MemberPlan {
  if (input.actorUserId === input.targetUserId) {
    return { ok: false, code: "UNPROCESSABLE", message: "Voce nao pode remover a si mesmo." }
  }
  if (isAdminRole(input.currentRole) && input.adminCount <= 1) {
    return { ok: false, code: "UNPROCESSABLE", message: "A organizacao precisa de pelo menos um administrador." }
  }
  return { ok: true }
}
