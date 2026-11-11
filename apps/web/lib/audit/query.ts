import { auditActionLabel, describeAuditMetadata, isAuditAction } from "@/lib/audit/actions"
import { prisma } from "@/lib/db"

export const AUDIT_PAGE_SIZE = 50

/**
 * Registro de auditoria da organizacao, mais recente primeiro, paginado pelo id
 * da ultima linha mostrada. Filtros invalidos sao ignorados.
 */
export async function listAuditLog(input: {
  organizationId: string
  action?: string | null
  actorId?: string | null
  cursor?: string | null
}) {
  const where = {
    organizationId: input.organizationId,
    ...(isAuditAction(input.action) ? { action: input.action } : {}),
    ...(input.actorId ? { actorUserId: input.actorId } : {}),
  }

  const cursorRow = input.cursor
    ? await prisma.auditLog.findFirst({ where: { id: input.cursor, organizationId: input.organizationId }, select: { id: true } })
    : null

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: AUDIT_PAGE_SIZE + 1,
    ...(cursorRow ? { cursor: { id: cursorRow.id }, skip: 1 } : {}),
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      actor: { select: { id: true, name: true, email: true } },
    },
  })

  const page = rows.slice(0, AUDIT_PAGE_SIZE)
  return {
    entries: page.map((row) => ({
      id: row.id,
      action: row.action,
      label: auditActionLabel(row.action),
      entityType: row.entityType,
      entityId: row.entityId,
      details: describeAuditMetadata(row.metadata),
      createdAt: row.createdAt.toISOString(),
      actor: row.actor ? { id: row.actor.id, name: row.actor.name ?? row.actor.email } : null,
    })),
    nextCursor: rows.length > AUDIT_PAGE_SIZE ? (page.at(-1)?.id ?? null) : null,
  }
}

/** Pessoas que aparecem no registro (inclusive quem ja saiu da organizacao). */
export async function listAuditActors(organizationId: string) {
  const users = await prisma.user.findMany({
    where: { auditLogs: { some: { organizationId } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  })
  return users.map((user) => ({ id: user.id, name: user.name ?? user.email }))
}
