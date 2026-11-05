import { resolveActivityLinks, type ActivityType } from "@/lib/activities/rules"
import { opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"

export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string | null
  dueDate: string | null
  completedAt: string | null
  owner: { id: string; name: string } | null
  company: { id: string; name: string } | null
  contact: { id: string; name: string } | null
  opportunity: { id: string; title: string } | null
}

const activityInclude = {
  owner: { select: { id: true, name: true, email: true } },
  company: { select: { id: true, name: true } },
  contact: { select: { id: true, name: true } },
  opportunity: { select: { id: true, title: true } },
} as const

type ActivityRow = Prisma.ActivityGetPayload<{ include: typeof activityInclude }>

function toItem(row: ActivityRow): ActivityItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    owner: row.owner ? { id: row.owner.id, name: row.owner.name || row.owner.email } : null,
    company: row.company,
    contact: row.contact,
    opportunity: row.opportunity,
  }
}

/** Mesmo recorte das negociacoes: vendedor, so as proprias. */
export const activityScope = opportunityScope

export async function listActivities(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  where?: Prisma.ActivityWhereInput
  orderBy?: Prisma.ActivityOrderByWithRelationInput[]
  take?: number
}): Promise<ActivityItem[]> {
  const rows = await prisma.activity.findMany({
    where: {
      organizationId: input.organizationId,
      ...activityScope(input.role, input.userId),
      ...input.where,
    },
    include: activityInclude,
    orderBy: input.orderBy ?? [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: input.take,
  })
  return rows.map(toItem)
}

export type CheckedLinks =
  | { ok: true; companyId: string | null; contactId: string | null; opportunityId: string | null }
  | { ok: false; error: string }

/** Confere os vinculos na organizacao e no escopo do papel e completa empresa e contato. */
export async function checkActivityLinks(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  companyId: string | null
  contactId: string | null
  opportunityId: string | null
}): Promise<CheckedLinks> {
  const { organizationId, companyId, contactId, opportunityId } = input

  const [company, contact, opportunity] = await Promise.all([
    companyId
      ? prisma.company.findFirst({ where: { id: companyId, organizationId }, select: { id: true } })
      : null,
    contactId
      ? prisma.contact.findFirst({ where: { id: contactId, organizationId }, select: { companyId: true } })
      : null,
    opportunityId
      ? prisma.opportunity.findFirst({
          where: { id: opportunityId, organizationId, ...opportunityScope(input.role, input.userId) },
          select: { companyId: true, contactId: true },
        })
      : null,
  ])

  if (companyId && !company) return { ok: false, error: "Empresa invalida." }
  if (contactId && !contact) return { ok: false, error: "Contato invalido." }
  if (opportunityId && !opportunity) return { ok: false, error: "Negociacao invalida." }

  const links = resolveActivityLinks({ companyId, contactId, contact, opportunity })
  return links.ok ? { ...links, opportunityId } : links
}
