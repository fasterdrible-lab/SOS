import { prisma } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"

import type { AuditAction } from "@/lib/audit/actions"

export type { AuditAction } from "@/lib/audit/actions"

interface AuditEntry {
  organizationId: string
  actorUserId: string
  action: AuditAction
  entityType: string
  entityId?: string
  /** Nunca incluir chaves de API, senhas, tokens ou dados pessoais. */
  metadata?: Prisma.InputJsonValue
}

/** Passe `tx` para gravar na mesma transacao da operacao auditada. */
export function recordAudit(
  entry: AuditEntry,
  client: Prisma.TransactionClient = prisma
) {
  return client.auditLog.create({ data: entry })
}
