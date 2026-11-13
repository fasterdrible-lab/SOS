import Link from "next/link"

import { auth } from "@/lib/auth"
import { getAccessLevel, hasPermission, opportunityScope, assigneeScope } from "@/lib/authz/permissions"
import { getDashboardMembers } from "@/lib/dashboard/executive"
import { prisma } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"
import {
  BOARD_LIMIT,
  BOARD_STATUSES,
  ownerWhere,
  parseBoardFilters,
  type BoardSortKey,
} from "@/lib/opportunities/board"
import { STATUS_LABELS } from "@/lib/opportunities/rules"
import { getPipelines } from "@/lib/pipelines/service"

import { Board, type BoardCard, type BoardColumn } from "./board"
import { BoardFilters } from "./board-filters"
import { OpportunityFormDialog } from "./opportunity-form-dialog"
import { PipelineEditorDialog } from "./pipeline-editor-dialog"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})
// Previsao de fechamento e so uma data, gravada a meia-noite UTC.
const dateOnly = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" })

const DAY_MS = 24 * 60 * 60 * 1000

const ORDER_BY: Record<BoardSortKey, Prisma.OpportunityOrderByWithRelationInput[]> = {
  recentes: [{ createdAt: "desc" }],
  valor: [{ value: "desc" }, { createdAt: "desc" }],
  fechamento: [{ expectedClose: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  parados: [{ stageChangedAt: "asc" }],
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  const organizationId = session?.user?.organizationId
  const userId = session?.user?.id

  if (!organizationId || !userId) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Acesse um cliente para ver as negociações.
      </main>
    )
  }

  const role = session.user.role
  const teamId = session.user.teamId ?? null
  const isSeller = getAccessLevel(role) === "SELLER"
  const filters = parseBoardFilters(await searchParams)
  const [pipelines, members] = await Promise.all([
    getPipelines(organizationId),
    getDashboardMembers(organizationId, assigneeScope(role, teamId).teamId),
  ])
  const pipeline = pipelines.find((item) => item.id === filters.pipelineId) ?? pipelines[0]
  const statusFilter = BOARD_STATUSES.find((item) => item.key === filters.status)!

  const like = { contains: filters.query, mode: "insensitive" as const }
  const where: Prisma.OpportunityWhereInput = {
    organizationId,
    pipelineId: pipeline.id,
    status: { in: statusFilter.statuses },
    ...(isSeller ? {} : ownerWhere(filters.owner, userId)),
    ...opportunityScope(role, userId, teamId),
    ...(filters.query
      ? { OR: [{ title: like }, { company: { name: like } }, { contact: { name: like } }] }
      : {}),
  }

  const [opportunities, total, companies, contacts] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      include: {
        company: { select: { name: true } },
        owner: { select: { name: true, email: true } },
        stage: { select: { name: true } },
      },
      orderBy: ORDER_BY[filters.sort],
      take: BOARD_LIMIT,
    }),
    prisma.opportunity.count({ where }),
    prisma.company.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const now = new Date()
  const cards: BoardCard[] = opportunities.map((opportunity) => ({
    id: opportunity.id,
    title: opportunity.title,
    value: Number(opportunity.value),
    stageId: opportunity.stageId,
    status: opportunity.status,
    companyName: opportunity.company?.name ?? null,
    ownerName: opportunity.owner ? opportunity.owner.name || opportunity.owner.email : null,
    daysInStage: Math.max(0, Math.floor((now.getTime() - opportunity.stageChangedAt.getTime()) / DAY_MS)),
  }))

  const activeIds = new Set(pipeline.stages.map((stage) => stage.id))
  const columns: BoardColumn[] = pipeline.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    droppable: true,
  }))
  // Encerradas que ficaram em etapas depois removidas do funil.
  const removed = [...new Set(cards.map((card) => card.stageId))].filter((id) => !activeIds.has(id))
  for (const id of removed) {
    const name = opportunities.find((item) => item.stageId === id)?.stage.name
    columns.push({ id, name: `${name} (removida)`, droppable: false })
  }

  const totalValue = cards.reduce((sum, card) => sum + card.value, 0)

  return (
    <div className="flex flex-1 flex-col">
      <main className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Negociações</h1>
            <p className="text-sm text-muted-foreground">
              {total === 1 ? "1 negociação" : `${total} negociações`} · {statusFilter.label.toLowerCase()} no
              funil {pipeline.name} · {currencyFormatter.format(totalValue)}
              {total > cards.length && ` · mostrando as ${cards.length} primeiras`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasPermission(role, "pipelines:manage") && (
              <PipelineEditorDialog pipelines={pipelines} currentId={pipeline.id} />
            )}
            <OpportunityFormDialog
              companies={companies}
              contacts={contacts}
              stageId={pipeline.stages[0].id}
            />
          </div>
        </div>

        <BoardFilters
          filters={{ ...filters, pipelineId: pipeline.id === pipelines[0].id ? "" : pipeline.id }}
          pipelines={pipelines.map((item) => ({ id: item.id, name: item.name }))}
          members={isSeller ? null : members}
        />

        {filters.view === "lista" ? (
          <div className="overflow-x-auto rounded-xl border border-foreground/5 bg-card">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-foreground/5 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Negociação</th>
                  <th className="px-3 py-2 font-medium">Empresa</th>
                  <th className="px-3 py-2 font-medium">Etapa</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Dono</th>
                  <th className="px-3 py-2 font-medium">Fechamento</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {opportunities.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      Nenhuma negociação com estes filtros.
                    </td>
                  </tr>
                )}
                {opportunities.map((opportunity) => (
                  <tr key={opportunity.id}>
                    <td className="max-w-64 truncate px-3 py-2">
                      <Link href={`/pipeline/${opportunity.id}`} className="font-medium text-foreground hover:text-gold-fg">
                        {opportunity.title}
                      </Link>
                    </td>
                    <td className="max-w-48 truncate px-3 py-2 text-muted-foreground">
                      {opportunity.company?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{opportunity.stage.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{STATUS_LABELS[opportunity.status]}</td>
                    <td className="max-w-40 truncate px-3 py-2 text-muted-foreground">
                      {opportunity.owner ? opportunity.owner.name || opportunity.owner.email : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {opportunity.expectedClose ? dateOnly.format(opportunity.expectedClose) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gold-fg">
                      {currencyFormatter.format(Number(opportunity.value))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Board
            cards={cards}
            columns={columns}
            stages={pipeline.stages.map((stage) => ({ id: stage.id, name: stage.name }))}
          />
        )}

      </main>
    </div>
  )
}
