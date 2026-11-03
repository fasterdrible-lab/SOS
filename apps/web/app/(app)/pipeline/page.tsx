import Link from "next/link"

import { auth } from "@/lib/auth"
import { hasPermission, opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import type { OpportunityStatus } from "@/lib/opportunities/rules"
import { getPipelines } from "@/lib/pipelines/service"
import { cn } from "@/lib/utils"

import { OpportunityCard, type OpportunityCardData } from "./opportunity-card"
import { OpportunityFormDialog } from "./opportunity-form-dialog"
import { PipelineEditorDialog } from "./pipeline-editor-dialog"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})

const STATUS_FILTERS: { key: string; label: string; statuses: OpportunityStatus[] }[] = [
  { key: "abertas", label: "Em andamento", statuses: ["OPEN"] },
  { key: "ganhas", label: "Ganhas", statuses: ["WON"] },
  { key: "perdidas", label: "Perdidas", statuses: ["LOST"] },
  { key: "todas", label: "Todas", statuses: ["OPEN", "WON", "LOST"] },
]

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!organizationId || !session?.user?.id) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Acesse um cliente para ver as negociações.
      </main>
    )
  }

  const role = session.user.role
  const query = await searchParams
  const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)
  const pipelines = await getPipelines(organizationId)
  const pipeline = pipelines.find((item) => item.id === single(query.funil)) ?? pipelines[0]
  const statusFilter = STATUS_FILTERS.find((item) => item.key === single(query.status)) ?? STATUS_FILTERS[0]

  const [opportunities, companies, contacts] = await Promise.all([
    prisma.opportunity.findMany({
      where: {
        organizationId,
        pipelineId: pipeline.id,
        status: { in: statusFilter.statuses },
        ...opportunityScope(role, session.user.id),
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
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

  const cards: OpportunityCardData[] = opportunities.map((opportunity) => ({
    id: opportunity.id,
    title: opportunity.title,
    value: Number(opportunity.value),
    stageId: opportunity.stageId,
    status: opportunity.status,
    lostReason: opportunity.lostReason,
    companyName: opportunity.company?.name ?? null,
    contactName: opportunity.contact?.name ?? null,
  }))

  const activeIds = new Set(pipeline.stages.map((stage) => stage.id))
  const columns = pipeline.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    items: cards.filter((card) => card.stageId === stage.id),
  }))
  // Encerradas que ficaram em etapas depois removidas do funil.
  const orphans = cards.filter((card) => !activeIds.has(card.stageId))
  if (orphans.length > 0) columns.push({ id: "removidas", name: "Etapas removidas", items: orphans })

  const href = (next: { funil?: string; status?: string }) => {
    const params = new URLSearchParams()
    const funil = next.funil ?? pipeline.id
    const status = next.status ?? statusFilter.key
    if (funil !== pipelines[0].id) params.set("funil", funil)
    if (status !== STATUS_FILTERS[0].key) params.set("status", status)
    const text = params.toString()
    return text ? `/pipeline?${text}` : "/pipeline"
  }

  const canReopen = hasPermission(role, "opportunities:reopen")
  const stageOptions = pipeline.stages.map((stage) => ({ id: stage.id, name: stage.name }))

  return (
    <div className="flex flex-1 flex-col">
      <main className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Negociações</h1>
            <p className="text-sm text-muted-foreground">
              {opportunities.length === 1 ? "1 negociação" : `${opportunities.length} negociações`} ·{" "}
              {statusFilter.label.toLowerCase()} no funil {pipeline.name}
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

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-foreground/5 bg-card px-3 py-2">
          {pipelines.length > 1 && (
            <nav className="flex flex-wrap gap-1" aria-label="Funis">
              {pipelines.map((item) => (
                <FilterLink key={item.id} href={href({ funil: item.id })} active={item.id === pipeline.id}>
                  {item.name}
                </FilterLink>
              ))}
            </nav>
          )}
          <nav className="flex flex-wrap gap-1" aria-label="Status">
            {STATUS_FILTERS.map((item) => (
              <FilterLink key={item.key} href={href({ status: item.key })} active={item.key === statusFilter.key}>
                {item.label}
              </FilterLink>
            ))}
          </nav>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((column) => {
            const total = column.items.reduce((sum, item) => sum + item.value, 0)
            return (
              <section
                key={column.id}
                aria-label={column.name}
                className="w-72 shrink-0 rounded-xl border border-foreground/5 bg-card"
              >
                <div className="border-b border-foreground/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{column.name}</span>
                    <span className="text-xs text-muted-foreground">{column.items.length}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{currencyFormatter.format(total)}</span>
                </div>

                <div className="space-y-2 p-2">
                  {column.items.length === 0 ? (
                    <p className="p-2 text-center text-xs text-muted-foreground">Nenhuma negociação</p>
                  ) : (
                    column.items.map((item) => (
                      <OpportunityCard
                        key={item.id}
                        opportunity={item}
                        stages={stageOptions}
                        canReopen={canReopen}
                      />
                    ))
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-[#D4A64F]/15 font-medium text-gold-fg"
          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  )
}
