import { getAccessLevel } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"
import { matchMeeting, participantEmails, sortInsights, type InsightKind, type MeetingMatch } from "@/lib/saleia/rules"
import type { SaleiaEvent } from "@/lib/validations/saleia-event"

export interface SaleiaInsightItem {
  id: string
  kind: InsightKind
  text: string
  quote: string | null
  stageName: string | null
  dueDate: string | null
  status: "OPEN" | "ACCEPTED" | "DISMISSED"
}

export interface SaleiaMeetingItem {
  id: string
  title: string
  startedAt: string
  durationMinutes: number | null
  participants: { name: string; email: string | null }[]
  summary: string
  analyzedAt: string
  company: { id: string; name: string } | null
  contact: { id: string; name: string } | null
  opportunity: { id: string; title: string } | null
  insights: SaleiaInsightItem[]
}

/**
 * Reunioes nao tem dono: o vendedor ve as ligadas as proprias negociacoes;
 * gestor e administrador veem todas, inclusive as sem vinculo.
 */
export function saleiaMeetingScope(role: string | null | undefined, userId: string): Prisma.SaleiaMeetingWhereInput {
  const level = getAccessLevel(role)
  if (level === "ADMIN" || level === "MANAGER") return {}
  if (level === "SELLER") return { opportunity: { ownerId: userId } }
  return { id: "__sem_acesso__" }
}

const meetingInclude = {
  company: { select: { id: true, name: true } },
  contact: { select: { id: true, name: true } },
  opportunity: { select: { id: true, title: true } },
  insights: true,
} as const

type MeetingRow = Prisma.SaleiaMeetingGetPayload<{ include: typeof meetingInclude }>

function toItem(row: MeetingRow): SaleiaMeetingItem {
  return {
    id: row.id,
    title: row.title,
    startedAt: row.startedAt.toISOString(),
    durationMinutes: row.durationMinutes,
    participants: Array.isArray(row.participants)
      ? (row.participants as { name: string; email: string | null }[])
      : [],
    summary: row.summary,
    analyzedAt: row.analyzedAt.toISOString(),
    company: row.company,
    contact: row.contact,
    opportunity: row.opportunity,
    insights: sortInsights(row.insights).map((insight) => ({
      id: insight.id,
      kind: insight.kind,
      text: insight.text,
      quote: insight.quote,
      stageName: insight.stageName,
      dueDate: insight.dueDate?.toISOString() ?? null,
      status: insight.status,
    })),
  }
}

export async function listSaleiaMeetings(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  where?: Prisma.SaleiaMeetingWhereInput
  take?: number
}): Promise<SaleiaMeetingItem[]> {
  const rows = await prisma.saleiaMeeting.findMany({
    where: {
      AND: [{ organizationId: input.organizationId }, saleiaMeetingScope(input.role, input.userId), input.where ?? {}],
    },
    include: meetingInclude,
    orderBy: { startedAt: "desc" },
    take: input.take,
  })
  return rows.map(toItem)
}

export async function getSaleiaMeeting(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  id: string
}): Promise<SaleiaMeetingItem | null> {
  const [meeting] = await listSaleiaMeetings({ ...input, where: { id: input.id }, take: 1 })
  return meeting ?? null
}

/** Candidatos do CRM para o vinculo, todos da organizacao. */
async function findMatch(organizationId: string, event: SaleiaEvent): Promise<MeetingMatch> {
  const emails = participantEmails(event.meeting.participants)
  const { opportunityId, companyName } = event.links

  const [opportunity, contacts, company] = await Promise.all([
    opportunityId
      ? prisma.opportunity.findFirst({
          where: { id: opportunityId, organizationId },
          select: { id: true, companyId: true, contactId: true },
        })
      : null,
    emails.length > 0
      ? prisma.contact.findMany({
          where: {
            organizationId,
            OR: emails.map((email) => ({ email: { equals: email, mode: "insensitive" as const } })),
          },
          select: { id: true, companyId: true },
          orderBy: { createdAt: "asc" },
          take: 20,
        })
      : [],
    companyName
      ? prisma.company.findFirst({
          where: { organizationId, name: { equals: companyName, mode: "insensitive" } },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        })
      : null,
  ])

  const companyIds = [
    ...new Set([...contacts.map((contact) => contact.companyId), company?.id].filter((id): id is string => Boolean(id))),
  ]
  const open =
    !opportunity && companyIds.length > 0
      ? await prisma.opportunity.findMany({
          where: { organizationId, status: "OPEN", companyId: { in: companyIds } },
          select: { id: true, companyId: true, contactId: true },
          take: 50,
        })
      : []

  return matchMeeting({
    opportunity,
    contacts,
    company,
    openOpportunitiesOf: (companyId) => open.filter((item) => item.companyId === companyId),
  })
}

export interface IngestResult {
  meetingId: string
  created: boolean
  match: MeetingMatch
}

/**
 * Grava a reuniao analisada. Reenviar a mesma reuniao (mesmo `externalId`)
 * atualiza os dados e troca os insights ainda nao decididos por uma pessoa.
 */
export async function ingestSaleiaEvent(organizationId: string, event: SaleiaEvent): Promise<IngestResult> {
  const match = await findMatch(organizationId, event)
  const { meeting } = event

  const data = {
    title: meeting.title,
    startedAt: new Date(meeting.startedAt),
    durationMinutes: meeting.durationMinutes,
    participants: meeting.participants,
    summary: meeting.summary,
    analyzedAt: new Date(event.occurredAt),
    companyId: match.companyId,
    contactId: match.contactId,
    opportunityId: match.opportunityId,
  }

  const save = () =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.saleiaMeeting.findUnique({
        where: { organizationId_externalId: { organizationId, externalId: meeting.externalId } },
        select: { id: true },
      })

      const saved = existing
        ? await tx.saleiaMeeting.update({ where: { id: existing.id }, data })
        : await tx.saleiaMeeting.create({ data: { ...data, organizationId, externalId: meeting.externalId } })

      await tx.saleiaInsight.deleteMany({ where: { meetingId: saved.id, status: "OPEN" } })
      if (event.insights.length > 0) {
        await tx.saleiaInsight.createMany({
          data: event.insights.map((insight, position) => ({
            organizationId,
            meetingId: saved.id,
            kind: insight.kind,
            text: insight.text,
            quote: insight.quote,
            stageName: insight.stageName,
            dueDate: insight.dueDate ? new Date(insight.dueDate) : null,
            position,
          })),
        })
      }

      await tx.saleiaIntegration.update({ where: { organizationId }, data: { lastEventAt: new Date() } })
      return { meetingId: saved.id, created: !existing }
    })

  try {
    return { ...(await save()), match }
  } catch (error) {
    // Duas entregas simultaneas da mesma reuniao: a segunda vira atualizacao.
    if ((error as { code?: string }).code === "P2002") return { ...(await save()), match }
    throw error
  }
}
