import { NextResponse } from "next/server"

import { hasPermission, type Permission } from "@/lib/authz/permissions"

/** Resposta 403 quando o papel da sessao nao tem a permissao; `null` quando tem. */
export function denyUnless(
  role: string | null | undefined,
  permission: Permission
): NextResponse | null {
  if (hasPermission(role, permission)) return null

  return NextResponse.json(
    { error: "Seu perfil nao tem permissao para esta acao." },
    { status: 403 }
  )
}
