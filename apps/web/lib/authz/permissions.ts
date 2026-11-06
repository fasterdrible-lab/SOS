export type AccessLevel = "ADMIN" | "MANAGER" | "SELLER"

const ROLE_LEVELS: Record<string, AccessLevel> = {
  OWNER: "ADMIN",
  ADMIN: "ADMIN",
  // O consultor administra a organizacao-cliente que criou.
  CONSULTANT: "ADMIN",
  MANAGER: "MANAGER",
  MEMBER: "SELLER",
}

const EVERYONE: readonly AccessLevel[] = ["ADMIN", "MANAGER", "SELLER"]
const MANAGERS: readonly AccessLevel[] = ["ADMIN", "MANAGER"]
const ADMINS: readonly AccessLevel[] = ["ADMIN"]

const PERMISSIONS = {
  "my-day:read": EVERYONE,
  "goals:manage": MANAGERS,
  "dashboard:read": EVERYONE,
  "crm:read": EVERYONE,
  "crm:write": EVERYONE,
  "opportunities:read": EVERYONE,
  "opportunities:write": EVERYONE,
  "opportunities:reopen": MANAGERS,
  "opportunities:assign": MANAGERS,
  "pipelines:manage": MANAGERS,
  "activities:read": EVERYONE,
  "activities:write": EVERYONE,
  "activities:assign": MANAGERS,
  "saleia:read": EVERYONE,
  "diagnostics:write": EVERYONE,
  "action-plans:read": EVERYONE,
  "action-plans:write": MANAGERS,
  "action-tasks:update-status": EVERYONE,
  "sdr:read": MANAGERS,
  "consultant:use": MANAGERS,
  "integrations:manage": ADMINS,
  "organizations:create": ADMINS,
} as const

export type Permission = keyof typeof PERMISSIONS

export function getAccessLevel(role: string | null | undefined): AccessLevel | null {
  if (!role || !Object.hasOwn(ROLE_LEVELS, role)) return null
  return ROLE_LEVELS[role]
}

export function hasPermission(
  role: string | null | undefined,
  permission: Permission
): boolean {
  const level = getAccessLevel(role)
  if (!level) return false
  return (PERMISSIONS[permission] as readonly AccessLevel[]).includes(level)
}

/**
 * Filtro Prisma das oportunidades visiveis para o papel. Vendedor ve apenas as
 * proprias; papel desconhecido nao ve nada (`ownerId` impossivel).
 */
export function opportunityScope(
  role: string | null | undefined,
  userId: string
): { ownerId?: string } {
  const level = getAccessLevel(role)
  if (level === "ADMIN" || level === "MANAGER") return {}
  return { ownerId: level === "SELLER" ? userId : "__sem_acesso__" }
}

/**
 * Criar organizacao nao acontece dentro de uma organizacao: vale o primeiro
 * acesso (nenhum vinculo) ou ser administrador em alguma delas.
 */
export function canCreateOrganization(memberRoles: readonly string[]): boolean {
  if (memberRoles.length === 0) return true
  return memberRoles.some((role) => hasPermission(role, "organizations:create"))
}
