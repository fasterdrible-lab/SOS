import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { getDashboardMembers } from "@/lib/dashboard/executive"
import { prisma } from "@/lib/db"
import { getOpportunityDetail, type OpportunityHistoryEntry } from "@/lib/opportunities/detail"
import { STATUS_LABELS } from "@/lib/opportunities/rules"
import { getPipelines } from "@/lib/pipelines/service"
import { BUSINESS_TIME_ZONE } from "@/lib/time/business-calendar"
import { cn } from "@/lib/utils"

import { OpportunityActions } from "./opportunity-actions"
import { OpportunityEditDialog } from "./opportunity-edit-dialog"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
// Previsao de fechamento e so uma data, gravada a meia-noite UTC.
const dateOnly = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

function describeChange(entry: OpportunityHistoryEntry): string {
  if (entry.fromStatus === null) return `Criada em ${entry.toStageName}`
  if (entry.fromStatus !== entry.toStatus) {
    if (entry.toStatus === "WON") return `Ganha em ${entry.toStageName}`
    if (entry.toStatus === "LOST") return `Perdida em ${entry.toStageName}`
    return `Reaberta em ${entry.toStageName}`
  }
  return `${entry.fromStageName} → ${entry.toStageName}`
}

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const organizationId = session?.user?.organizationId
  const userId = session?.user?.id

  if (!organizationId || !userId) notFound()

  const role = session.user.role
  const { id } = await params
  const opportunity = await getOpportunityDetail({ id, organizationId, userId, role })

  // De outra organizacao ou de outro vendedor: mesma resposta de inexistente.
  if (!opportunity) notFound()

  const canAssign = hasPermission(role, "opportunities:assign")
  const canReopen = hasPermission(role, "opportunities:reopen")
  const canEdit = opportunity.status === "OPEN" || canReopen

  const [pipelines, members, companies, contacts] = await Promise.all([
    getPipelines(organizationId),
    canAssign ? getDashboardMembers(organizationId) : null,
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

  const facts = [
    { label: "Funil", value: opportunity.pipeline.name },
    {
      label: "Etapa",
      value: opportunity.stage.archived ? `${opportunity.stage.name} (removida)` : opportunity.stage.name,
    },
    { label: "Probabilidade", value: `${opportunity.probability}%` },
    { label: "Dono", value: opportunity.owner?.name ?? "Sem responsável" },
    { label: "Empresa", value: opportunity.company?.name ?? "—" },
    { label: "Contato", value: opportunity.contact?.name ?? "—" },
    {
      label: "Previsão de fechamento",
      value: opportunity.expectedClose ? dateOnly.format(new Date(opportunity.expectedClose)) : "—",
    },
    { label: "Criada em", value: dateTime.format(new Date(opportunity.createdAt)) },
  ]

  return (
    <main className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Negociações
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{opportunity.title}</h1>
            <Badge
              variant="outline"
              className={cn(
                opportunity.status === "WON" && "border-emerald-400/30 text-emerald-700 dark:text-emerald-300",
                opportunity.status === "LOST" && "border-red-400/20 text-red-700 dark:text-red-300"
              )}
            >
              {STATUS_LABELS[opportunity.status]}
            </Badge>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-gold-fg">{brl.format(opportunity.value)}</p>
        </div>
        {canEdit && (
          <OpportunityEditDialog
            id={opportunity.id}
            values={{
              title: opportunity.title,
              value: opportunity.value,
              companyId: opportunity.company?.id ?? "",
              contactId: opportunity.contact?.id ?? "",
              ownerId: opportunity.owner?.id ?? "",
              expectedClose: opportunity.expectedClose?.slice(0, 10) ?? "",
              notes: opportunity.notes ?? "",
            }}
            companies={companies}
            contacts={contacts}
            owners={members?.map((member) => ({ id: member.userId, name: member.name })) ?? null}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card className="border-foreground/5 bg-card py-0">
            <CardContent className="p-5">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {facts.map((fact) => (
                  <div key={fact.label} className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                      {fact.label}
                    </dt>
                    <dd className="truncate text-sm text-foreground">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              {opportunity.lostReason && (
                <p className="mt-4 text-sm text-red-700 dark:text-red-300">
                  Motivo da perda: {opportunity.lostReason}
                </p>
              )}
              {opportunity.notes && (
                <div className="mt-4 space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Observações
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{opportunity.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-foreground/5 bg-card py-0">
            <CardContent className="space-y-3 p-5">
              <h2 className="text-sm font-semibold text-foreground">Histórico</h2>
              <ol className="space-y-3">
                {opportunity.history.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-[#D4A64F]/40 pl-3">
                    <p className="text-sm text-foreground">{describeChange(entry)}</p>
                    <p className="text-xs text-muted-foreground">
                      {dateTime.format(new Date(entry.changedAt))}
                      {entry.changedByName ? ` · ${entry.changedByName}` : ""}
                    </p>
                    {entry.lostReason && (
                      <p className="text-xs text-muted-foreground">Motivo: {entry.lostReason}</p>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit border-foreground/5 bg-card py-0">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold text-foreground">Ações</h2>
            <OpportunityActions
              id={opportunity.id}
              status={opportunity.status}
              stageId={opportunity.stage.id}
              pipelines={pipelines}
              canReopen={canReopen}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
