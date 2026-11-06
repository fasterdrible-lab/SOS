import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ClipboardList, History, KanbanSquare, ListTodo, Sparkles, Users, Zap, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { getCompanyOverview } from "@/lib/companies/overview"
import { getDashboardMembers } from "@/lib/dashboard/executive"
import { prisma } from "@/lib/db"
import { STATUS_LABELS } from "@/lib/opportunities/rules"
import { BUSINESS_TIME_ZONE } from "@/lib/time/business-calendar"
import { cn } from "@/lib/utils"

import { ActivityFormDialog } from "../../atividades/activity-form-dialog"
import { ActivityList } from "../../atividades/activity-list"
import { ContactEditDialog } from "../../contatos/contact-edit-dialog"
import { MeetingList } from "../../saleia/meeting-list"
import { ContactFormDialog } from "../../contatos/contact-form-dialog"
import { CompanyEditDialog } from "./company-edit-dialog"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: BUSINESS_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" })
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Novo",
  CONTACTED: "Contatado",
  QUALIFIED: "Qualificado",
  UNQUALIFIED: "Desqualificado",
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const organizationId = session?.user?.organizationId
  const userId = session?.user?.id

  if (!organizationId || !userId) notFound()

  const { id } = await params
  const company = await getCompanyOverview({ id, organizationId, userId, role: session.user.role })

  if (!company) notFound()

  const [companies, members] = await Promise.all([
    prisma.company.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    hasPermission(session.user.role, "activities:assign") ? getDashboardMembers(organizationId) : null,
  ])
  const activityMembers = members?.map((member) => ({ id: member.userId, name: member.name })) ?? null

  const { summary } = company
  const details = [company.segment, company.website, company.phone, company.email].filter(Boolean)
  const stats = [
    { label: "Faturado", value: brl.format(summary.won.value), detail: summary.won.count === 1 ? "1 venda" : `${summary.won.count} vendas` },
    { label: "Pipeline aberto", value: brl.format(summary.open.value), detail: summary.open.count === 1 ? "1 negociação" : `${summary.open.count} negociações` },
    { label: "Ticket médio", value: summary.averageTicket === null ? "—" : brl.format(summary.averageTicket), detail: "faturado ÷ vendas" },
    { label: "Taxa de ganho", value: summary.winRate === null ? "—" : `${number.format(summary.winRate)}%`, detail: summary.lostCount === 1 ? "1 perdida" : `${summary.lostCount} perdidas` },
    { label: "Última movimentação", value: summary.lastMovementAt ? date.format(new Date(summary.lastMovementAt)) : "—", detail: "etapa ou status" },
  ]

  return (
    <main className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
      <Link href="/empresas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Empresas
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{company.name}</h1>
          {details.length > 0 && <p className="break-words text-sm text-muted-foreground">{details.join(" · ")}</p>}
          <p className="text-xs text-muted-foreground">
            {company.scope === "OWN" ? "Números das suas negociações nesta empresa" : "Todas as negociações desta empresa"}
          </p>
        </div>
        <CompanyEditDialog
          id={company.id}
          values={{
            name: company.name,
            segment: company.segment ?? "",
            website: company.website ?? "",
            phone: company.phone ?? "",
            email: company.email ?? "",
          }}
        />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores da empresa">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-foreground/5 bg-card py-0">
            <CardContent className="space-y-1 p-4">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-semibold tracking-tight text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Panel icon={KanbanSquare} title={`Negociações (${company.opportunities.length})`}>
            {company.opportunities.length === 0 ? (
              <Empty>Nenhuma negociação nesta empresa.</Empty>
            ) : (
              <ul className="divide-y divide-foreground/5">
                {company.opportunities.map((item) => (
                  <li key={item.id}>
                    <Link href={`/pipeline/${item.id}`} className="flex items-start justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-foreground">{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[item.pipelineName, item.stageName, item.ownerName].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-medium text-gold-fg">{brl.format(item.value)}</span>
                        {item.status !== "OPEN" && (
                          <Badge
                            variant="outline"
                            className={cn(
                              item.status === "WON"
                                ? "border-emerald-400/30 text-emerald-700 dark:text-emerald-300"
                                : "border-red-400/20 text-red-700 dark:text-red-300"
                            )}
                          >
                            {STATUS_LABELS[item.status]}
                          </Badge>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            icon={ListTodo}
            title={`Atividades (${company.activities.length})`}
            action={
              <ActivityFormDialog
                context={{ companyId: company.id }}
                options={null}
                members={activityMembers}
                userId={userId}
              />
            }
          >
            {company.activities.length === 0 ? (
              <Empty>Nenhuma atividade nesta empresa.</Empty>
            ) : (
              <ActivityList activities={company.activities} options={null} members={activityMembers} userId={userId} />
            )}
          </Panel>

          <Panel icon={History} title="Linha do tempo">
            {company.timeline.length === 0 ? (
              <Empty>Nenhuma movimentação registrada.</Empty>
            ) : (
              <ol className="space-y-3">
                {company.timeline.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-[#D4A64F]/40 pl-3">
                    <p className="text-sm text-foreground">
                      <Link href={`/pipeline/${entry.opportunityId}`} className="font-medium hover:text-gold-fg">
                        {entry.opportunityTitle}
                      </Link>
                      : {entry.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dateTime.format(new Date(entry.at))}
                      {entry.byName ? ` · ${entry.byName}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel
            icon={Users}
            title={`Contatos (${company.contacts.length})`}
            action={<ContactFormDialog companies={companies} defaultCompanyId={company.id} />}
          >
            {company.contacts.length === 0 ? (
              <Empty>Nenhum contato nesta empresa.</Empty>
            ) : (
              <ul className="divide-y divide-foreground/5">
                {company.contacts.map((contact) => (
                  <li key={contact.id} className="flex items-start justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground">{contact.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[contact.role, contact.email, contact.phone].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </span>
                    <ContactEditDialog contact={contact} companies={companies} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {company.leads && (
            <Panel icon={Zap} title={`Leads (${company.leads.length})`}>
              {company.leads.length === 0 ? (
                <Empty>Nenhum lead vinculado.</Empty>
              ) : (
                <ul className="divide-y divide-foreground/5">
                  {company.leads.map((lead) => (
                    <li key={lead.id} className="py-2">
                      <span className="block truncate text-sm text-foreground">{lead.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[LEAD_STATUS_LABELS[lead.status] ?? lead.status, lead.source, date.format(new Date(lead.createdAt))]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel icon={ClipboardList} title="Diagnóstico">
            {company.diagnostic ? (
              <Link href={`/diagnostico/${company.diagnostic.id}`} className="block py-1 text-sm text-foreground hover:text-gold-fg">
                {company.diagnostic.maturityScore === null
                  ? "Ver diagnóstico"
                  : `Maturidade ${number.format(company.diagnostic.maturityScore)}`}{" "}
                · {date.format(new Date(company.diagnostic.createdAt))} →
              </Link>
            ) : (
              <Empty>Nenhum diagnóstico com o nome desta empresa.</Empty>
            )}
          </Panel>

          <Panel icon={Sparkles} title={`SALEIA (${company.saleiaMeetings.length})`}>
            {company.saleiaMeetings.length === 0 ? (
              <Empty>Nenhuma reunião analisada pelo SALEIA nesta empresa.</Empty>
            ) : (
              <MeetingList meetings={company.saleiaMeetings} showLinks={false} />
            )}
          </Panel>
        </div>
      </div>
    </main>
  )
}

function Panel({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="border-foreground/5 bg-card py-0">
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gold-fg" />
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-1 text-sm text-muted-foreground">{children}</p>
}
