import { hasPermission, opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { STATUS_LABELS } from "@/lib/opportunities/rules"
import { SEARCH_RESULTS_PER_GROUP } from "@/lib/search/query"

export interface SearchResult {
  id: string
  title: string
  subtitle: string | null
  href: string
}

export interface SearchGroup {
  key: "companies" | "contacts" | "opportunities" | "plans"
  label: string
  results: SearchResult[]
}

function joined(...parts: (string | null | undefined)[]) {
  const text = parts.filter(Boolean).join(" · ")
  return text || null
}

/**
 * Busca na organizacao ativa, respeitando o papel: grupos sem permissao nao sao
 * consultados e o vendedor so encontra as proprias negociacoes. Contato leva a
 * pagina da empresa dele; sem empresa, a listagem.
 */
export async function globalSearch(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  term: string
}): Promise<SearchGroup[]> {
  const { organizationId, userId, role, term } = input
  const like = { contains: term, mode: "insensitive" as const }
  const take = SEARCH_RESULTS_PER_GROUP

  const [companies, contacts, opportunities, plans] = await Promise.all([
    hasPermission(role, "crm:read")
      ? prisma.company.findMany({
          where: { organizationId, OR: [{ name: like }, { email: like }, { segment: like }] },
          select: { id: true, name: true, segment: true, email: true },
          orderBy: { name: "asc" },
          take,
        })
      : [],
    hasPermission(role, "crm:read")
      ? prisma.contact.findMany({
          where: {
            organizationId,
            OR: [{ name: like }, { email: like }, { phone: like }],
          },
          select: { id: true, name: true, email: true, role: true, company: { select: { id: true, name: true } } },
          orderBy: { name: "asc" },
          take,
        })
      : [],
    hasPermission(role, "opportunities:read")
      ? prisma.opportunity.findMany({
          where: {
            organizationId,
            ...opportunityScope(role, userId),
            OR: [{ title: like }, { company: { name: like } }],
          },
          select: {
            id: true,
            title: true,
            status: true,
            stage: { select: { name: true } },
            company: { select: { name: true } },
          },
          orderBy: { updatedAt: "desc" },
          take,
        })
      : [],
    hasPermission(role, "action-plans:read")
      ? prisma.actionPlan.findMany({
          where: { organizationId, OR: [{ title: like }, { objective: like }] },
          select: { id: true, title: true, objective: true },
          orderBy: { updatedAt: "desc" },
          take,
        })
      : [],
  ])

  const groups: SearchGroup[] = [
    {
      key: "opportunities",
      label: "Negociações",
      results: opportunities.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: joined(
          row.status === "OPEN" ? row.stage.name : STATUS_LABELS[row.status],
          row.company?.name
        ),
        href: `/pipeline/${row.id}`,
      })),
    },
    {
      key: "companies",
      label: "Empresas",
      results: companies.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: joined(row.segment, row.email),
        href: `/empresas/${row.id}`,
      })),
    },
    {
      key: "contacts",
      label: "Contatos",
      results: contacts.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: joined(row.role, row.company?.name, row.email),
        href: row.company ? `/empresas/${row.company.id}` : "/contatos",
      })),
    },
    {
      key: "plans",
      label: "Planos de ação",
      results: plans.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: row.objective,
        href: `/planos/${row.id}`,
      })),
    },
  ]

  return groups.filter((group) => group.results.length > 0)
}
