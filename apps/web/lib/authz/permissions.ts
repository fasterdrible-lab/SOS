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
  /** Ver e fechar o proprio dia. */
  "reports:read": EVERYONE,
  /** Ver o dia e os dias fechados de outras pessoas. */
  "reports:team": MANAGERS,
  "diagnostics:write": EVERYONE,
  "action-plans:read": EVERYONE,
  "action-plans:write": MANAGERS,
  "action-tasks:update-status": EVERYONE,
  "sdr:read": MANAGERS,
  "consultant:use": MANAGERS,
  "integrations:manage": ADMINS,
  /** Convidar, trocar papel e remover pessoas da organizacao. */
  "members:manage": ADMINS,
  /** Consultar o registro de auditoria. */
  "audit:read": ADMINS,
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
  userId: string,
  teamId?: string | null
): OwnerScope {
  const level = getAccessLevel(role)
  if (level === "ADMIN") return {}
  if (level === "MANAGER") return teamId ? teamScope(teamId) : {}
  return { ownerId: level === "SELLER" ? userId : "__sem_acesso__" }
}

/** Filtro Prisma por dono, valido para negociacoes e atividades. */
export interface OwnerScope {
  ownerId?: string
  NOT?: {
    owner: {
      members: {
        some: {
          organization: { teams: { some: { id: string } } }
          OR: [{ teamId: null }, { teamId: { not: string } }]
        }
      }
    }
  }
}

/**
 * Gestor com equipe (V2-9.2): ve o que e da equipe e o que esta sem dono.
 * Escrito como "nao e de alguem desta organizacao fora da minha equipe": o
 * registro sem dono passa, e a chave NOT nao colide com os OR dos filtros de
 * texto. O vinculo e conferido na organizacao da equipe, porque o dono pode
 * pertencer a outras. Dono que ja saiu da organizacao tambem passa.
 */
function teamScope(teamId: string): OwnerScope {
  return {
    NOT: {
      owner: {
        members: {
          some: {
            organization: { teams: { some: { id: teamId } } },
            OR: [{ teamId: null }, { teamId: { not: teamId } }],
          },
        },
      },
    },
  }
}

/**
 * Filtro de OrganizationMember para quem pode receber uma negociacao ou
 * atividade: o gestor com equipe so atribui dentro dela, senao o registro
 * sairia da propria visao.
 */
export function assigneeScope(role: string | null | undefined, teamId?: string | null): { teamId?: string } {
  return isTeamManager(role, teamId) ? { teamId: teamId as string } : {}
}

/** Gestor limitado a uma equipe: so ele tem a visao restrita por equipe. */
export function isTeamManager(role: string | null | undefined, teamId?: string | null): boolean {
  return getAccessLevel(role) === "MANAGER" && Boolean(teamId)
}

/**
 * Criar organizacao nao acontece dentro de uma organizacao: vale o primeiro
 * acesso (nenhum vinculo) ou ser administrador em alguma delas.
 */
export function canCreateOrganization(memberRoles: readonly string[]): boolean {
  if (memberRoles.length === 0) return true
  return memberRoles.some((role) => hasPermission(role, "organizations:create"))
}
