import { apiError } from "@/lib/api/errors"
import { hasPermission, type Permission } from "@/lib/authz/permissions"

/** Resposta 403 quando o papel da sessao nao tem a permissao; `null` quando tem. */
export function denyUnless(
  role: string | null | undefined,
  permission: Permission
): Response | null {
  if (hasPermission(role, permission)) return null

  return apiError("FORBIDDEN", "Seu perfil nao tem permissao para esta acao.")
}
