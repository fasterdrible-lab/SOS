import { prisma } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"

export type AuditAction =
  | "integration.saved"
  | "integration.removed"
  | "organization.created"
  | "session.organization-switched"
  | "goal.saved"
  | "goal.removed"
  | "opportunity.updated"
  | "company.updated"
  | "contact.updated"
  | "pipeline.created"
  | "pipeline.updated"
  | "pipeline.archived"

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
