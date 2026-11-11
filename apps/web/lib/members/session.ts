import { apiError } from "@/lib/api/errors"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import type { Permission } from "@/lib/authz/permissions"

/** Sessao de administrador para as rotas de Configuracoes. */
export async function settingsSession(
  permission: Permission
): Promise<{ error: Response } | { organizationId: string; userId: string }> {
  const session = await auth()
  const organizationId = session?.user?.organizationId
  if (!session?.user?.id || !organizationId) {
    return { error: apiError("UNAUTHENTICATED", "Entre para continuar.") }
  }
  const denied = denyUnless(session.user.role, permission)
  if (denied) return { error: denied }
  return { organizationId, userId: session.user.id }
}
