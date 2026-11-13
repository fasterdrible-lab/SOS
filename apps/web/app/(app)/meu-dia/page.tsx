import Link from "next/link"
import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  Flame,
  Hourglass,
  ListChecks,
  MessagesSquare,
  Sparkles,
  Snowflake,
  type LucideIcon,
} from "lucide-react"

import { ACTIVITY_TYPE_LABELS } from "@/lib/activities/rules"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import {
  COOLING_AFTER_DAYS,
  getMyDaySummary,
  type ActivitySummaryItem,
  type OpportunityItem,
  type OpportunityList,
} from "@/lib/meu-dia/summary"
import { BUSINESS_TIME_ZONE } from "@/lib/time/business-calendar"
import { ORGANIZATION_GOAL_SCOPE } from "@/lib/validations/goal"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { ActivityToggle } from "../atividades/activity-toggle"
import { InsightActions } from "../saleia/insight-actions"
import { GoalDialog, type GoalMember } from "./goal-dialog"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const brlShort = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})
const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })
const longDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
})
const monthName = new Intl.DateTimeFormat("pt-BR", { timeZone: BUSINESS_TIME_ZONE, month: "long" })
const shortDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
})

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Administrador",
  ADMIN: "Administrador",
  CONSULTANT: "Consultor",
  MANAGER: "Gestor",
  MEMBER: "Vendedor",
}

const timeOnly = new Intl.DateTimeFormat("pt-BR", { timeZone: BUSINESS_TIME_ZONE, hour: "2-digit", minute: "2-digit" })
const shortDateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

const days = (count: number) => (count === 1 ? "1 dia" : `${count} dias`)

async function loadGoalMembers(organizationId: string, month: string) {
  const [members, goals] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId },
      select: { role: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.salesGoal.findMany({
      where: { organizationId, month },
      select: { scopeKey: true, amount: true },
    }),
  ])

  const goalByScope = new Map(goals.map((goal) => [goal.scopeKey, Number(goal.amount)]))

  return {
    organizationGoal: goalByScope.get(ORGANIZATION_GOAL_SCOPE) ?? null,
    members: members.map<GoalMember>((member) => ({
      userId: member.user.id,
      name: member.user.name || member.user.email,
      roleLabel: ROLE_LABELS[member.role] ?? member.role,
      goal: goalByScope.get(member.user.id) ?? null,
    })),
  }
}

export default async function MeuDiaPage() {
  const session = await auth()
  const organizationId = session?.user?.organizationId
  const userId = session?.user?.id

  if (!organizationId || !userId) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Acesse um cliente para ver o seu dia.
      </main>
    )
  }

  const role = session.user.role
  const teamId = session.user.teamId ?? null
  const now = new Date()
  const summary = await getMyDaySummary({ organizationId, userId, role, teamId, now })
  const goalEditor = hasPermission(role, "goals:manage")
    ? await loadGoalMembers(organizationId, summary.month)
    : null

  const month = monthName.format(now)
  const monthLabel = month.charAt(0).toUpperCase() + month.slice(1)
  const { goal } = summary
  const closedCount = summary.wonCount + summary.lostCount

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-foreground/5 bg-card px-4 py-3">
        <p className="text-sm text-foreground">
          <span className="font-semibold">Ações do dia</span>
          <span className="ml-2 text-muted-foreground">{longDate.format(now)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {summary.scope === "OWN" ? "Suas negociações" : "Toda a organização"}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores do mês">
        <Card className="border-foreground/5 bg-card py-0 md:col-span-2">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-widest text-gold-fg">
                {summary.scope === "OWN" ? "Sua meta de " : "Meta de "}
                {month}
              </p>
              {goalEditor && (
                <GoalDialog
                  month={summary.month}
                  monthLabel={monthLabel}
                  organizationGoal={goalEditor.organizationGoal}
                  members={goalEditor.members}
                />
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-3xl font-semibold tracking-tight text-foreground">
                {brl.format(goal.revenue)}
              </span>
              <span className="text-sm text-muted-foreground">
                {goal.goal !== null
                  ? `de ${brl.format(goal.goal)} · ${percent.format(goal.percent ?? 0)}%`
                  : "faturado no mês"}
              </span>
            </div>

            {goal.goal !== null ? (
              <>
                <GoalBar
                  percent={goal.percent ?? 0}
                  idealPercent={goal.idealToDate !== null ? (goal.idealToDate / goal.goal) * 100 : null}
                />
                <GoalStatus gap={goal.gapToIdeal} />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {goal.idealToDate !== null && <>Ideal hoje {brl.format(goal.idealToDate)} · </>}
                  {goal.projection !== null && <>Projeção {brl.format(goal.projection)} · </>}
                  {goal.dailyNeeded !== null && (
                    <>{brl.format(goal.dailyNeeded)} por dia útil para bater · </>
                  )}
                  dia útil {goal.businessDays.elapsed} de {goal.businessDays.total}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma meta definida para {month}.{" "}
                {goalEditor
                  ? "Defina a meta da equipe e dos vendedores."
                  : "Peça ao seu gestor para definir a sua meta."}
                {goal.projection !== null && (
                  <> No ritmo atual, o mês fecha em {brl.format(goal.projection)}.</>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <StatCard
          title="Conversão no mês"
          value={summary.conversionRate === null ? "—" : `${percent.format(summary.conversionRate)}%`}
          detail={
            closedCount === 0
              ? "nenhuma negociação encerrada no mês"
              : `${summary.wonCount} ganhas de ${closedCount} encerradas`
          }
        />
        <StatCard
          title="Ticket médio no mês"
          value={summary.averageTicket === null ? "—" : brl.format(summary.averageTicket)}
          detail="faturamento do mês ÷ vendas"
        />
        <StatCard
          title="Vendas de hoje"
          value={String(summary.salesToday.count)}
          detail={
            summary.salesToday.count === 0
              ? "nenhuma venda registrada hoje"
              : `${brl.format(summary.salesToday.revenue)} · já contam na meta`
          }
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Pendências do dia">
        <OpportunityCard
          icon={Hourglass}
          title="Propostas aguardando resposta"
          list={summary.proposals}
          empty="Nenhuma proposta aguardando resposta."
          describe={(item) => `há ${days(item.daysInStage)} em proposta`}
        />
        <OpportunityCard
          icon={Snowflake}
          title="Negociações esfriando"
          hint={`Sem mudar de etapa há mais de ${COOLING_AFTER_DAYS} dias.`}
          list={summary.cooling}
          empty="Nenhuma negociação parada além do prazo."
          describe={(item) => `${days(item.daysInStage)} em ${item.stageName.toLowerCase()}`}
        />
        <OpportunityCard
          icon={AlertTriangle}
          title="Fechamento previsto vencido"
          hint="Negociações abertas com data de fechamento já passada."
          list={summary.overdueClose}
          empty="Nenhuma previsão de fechamento vencida."
          describe={(item) =>
            item.expectedClose ? `previsto para ${shortDate.format(new Date(item.expectedClose))}` : ""
          }
          tone="alert"
        />

        <PanelCard
          icon={ListChecks}
          title={`Tarefas atrasadas e de hoje (${summary.tasks.overdue + summary.tasks.today})`}
          hint="Tarefas dos planos de ação."
        >
          {summary.tasks.items.length === 0 ? (
            <EmptyLine>Nada vencido nem vencendo hoje.</EmptyLine>
          ) : (
            <ul className="divide-y divide-foreground/5">
              {summary.tasks.items.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/planos/${task.planId}`}
                    className="flex items-start justify-between gap-3 py-2.5 hover:text-foreground"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground">{task.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {task.planTitle}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        task.overdue ? "text-red-700 dark:text-red-300" : "text-gold-fg"
                      )}
                    >
                      {task.overdue
                        ? `atrasada desde ${shortDate.format(new Date(task.dueDate))}`
                        : "vence hoje"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        {summary.hotLeads !== null && (
          <PanelCard icon={Flame} title="Leads quentes do IA SDR">
            {summary.hotLeads === 0 ? (
              <EmptyLine>Nenhum lead qualificado novo.</EmptyLine>
            ) : (
              <Link href="/sdr" className="block py-1 text-sm text-foreground hover:text-gold-fg">
                {summary.hotLeads === 1
                  ? "1 lead qualificado ainda não visto"
                  : `${summary.hotLeads} leads qualificados ainda não vistos`}{" "}
                →
              </Link>
            )}
          </PanelCard>
        )}

        <ActivityCard
          icon={CalendarClock}
          title={`Reuniões de hoje (${summary.meetingsToday.total})`}
          items={summary.meetingsToday.items}
          empty="Nenhuma reunião agendada para hoje."
        />
        <ActivityCard
          icon={MessagesSquare}
          title={`Follow-ups atrasados e de hoje (${summary.followUps.overdue + summary.followUps.today})`}
          hint="Follow-ups, ligações, e-mails e tarefas com data."
          items={summary.followUps.items}
          empty="Nenhum follow-up vencido nem vencendo hoje."
        />
        <PanelCard icon={ClipboardCheck} title="Fechar o dia">
          {summary.dayClosedAt ? (
            <EmptyLine>Seu dia foi fechado às {timeOnly.format(new Date(summary.dayClosedAt))}.</EmptyLine>
          ) : (
            <EmptyLine>
              Confira reuniões, FUPs e vendas de hoje e registre o fechamento.{" "}
              <Link href="/report" className="text-gold-fg hover:underline">
                Abrir o Report
              </Link>
            </EmptyLine>
          )}
        </PanelCard>
      </section>

      {summary.saleia && (
        <section aria-label="Inteligência SALEIA">
          <PanelCard
            icon={Sparkles}
            title={`Recomendações da SALEIA (${summary.saleia.total})`}
            hint="Das reuniões analisadas. Nada é aplicado sem a sua decisão."
          >
            {summary.saleia.items.length === 0 ? (
              <EmptyLine>Nenhuma recomendação esperando decisão.</EmptyLine>
            ) : (
              <ul className="divide-y divide-foreground/5">
                {summary.saleia.items.map((item) => (
                  <li key={item.id} className="space-y-1.5 py-2.5" data-saleia-insight={item.id}>
                    <p className="text-sm text-foreground">
                      <span className="mr-2 text-xs font-medium uppercase tracking-wide text-gold-fg">
                        {item.kind === "RECOMMENDATION" ? "Recomendação" : "Etapa sugerida"}
                      </span>
                      <span className="break-words">{item.text}</span>
                    </p>
                    <Link href={`/saleia/${item.meetingId}`} className="block truncate text-xs text-muted-foreground hover:text-foreground">
                      {[
                        item.meetingTitle,
                        shortDate.format(new Date(item.meetingStartedAt)),
                        item.companyName,
                        item.dueDate ? `prazo ${shortDate.format(new Date(item.dueDate))}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Link>
                    <InsightActions id={item.id} kind={item.kind} status="OPEN" stageName={item.stageName} />
                  </li>
                ))}
              </ul>
            )}
            {summary.saleia.total > summary.saleia.items.length && (
              <Link href="/saleia" className="block pt-1 text-xs text-gold-fg hover:underline">
                Ver as reuniões no SALEIA
              </Link>
            )}
          </PanelCard>
        </section>
      )}
    </main>
  )
}

function GoalBar({ percent: value, idealPercent }: { percent: number; idealPercent: number | null }) {
  const clamp = (number: number) => Math.min(Math.max(number, 0), 100)

  return (
    <div
      className="relative h-2 w-full rounded-full bg-foreground/10"
      role="progressbar"
      aria-label="Progresso da meta"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamp(value))}
    >
      <div
        className="h-full rounded-full bg-[#D4A64F] transition-all"
        style={{ width: `${clamp(value)}%` }}
      />
      {idealPercent !== null && (
        <div
          className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/70"
          style={{ left: `calc(${clamp(idealPercent)}% - 1px)` }}
          title="Ideal para hoje"
          aria-hidden
        />
      )}
    </div>
  )
}

function GoalStatus({ gap }: { gap: number | null }) {
  if (gap === null) return null
  if (gap > 0) {
    return (
      <p className="text-sm font-medium text-red-700 dark:text-red-300">
        Faltam {brl.format(gap)} para o ideal de hoje
      </p>
    )
  }
  return (
    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
      {gap === 0 ? "No ritmo ideal de hoje" : `${brl.format(-gap)} acima do ideal de hoje`}
    </p>
  )
}

function StatCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card className="border-foreground/5 bg-card py-0">
      <CardContent className="space-y-2 p-5">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function PanelCard({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-foreground/5 bg-card py-0">
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gold-fg" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {children}
      </CardContent>
    </Card>
  )
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="py-1 text-sm text-muted-foreground">{children}</p>
}

function OpportunityCard({
  icon,
  title,
  hint,
  list,
  empty,
  describe,
  tone,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  list: OpportunityList
  empty: string
  describe: (item: OpportunityItem) => string
  tone?: "alert"
}) {
  return (
    <PanelCard icon={icon} title={`${title} (${list.total})`} hint={hint}>
      {list.items.length === 0 ? (
        <EmptyLine>{empty}</EmptyLine>
      ) : (
        <ul className="divide-y divide-foreground/5">
          {list.items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/pipeline/${item.id}`}
                className="flex items-start justify-between gap-3 py-2.5 hover:text-foreground"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">{item.title}</span>
                  <span
                    className={cn(
                      "block truncate text-xs",
                      tone === "alert" ? "text-red-700 dark:text-red-300" : "text-muted-foreground"
                    )}
                  >
                    {[item.companyName, describe(item)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-gold-fg">
                  {brlShort.format(item.value)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {list.total > list.items.length && (
        <Link href="/pipeline" className="block pt-1 text-xs text-gold-fg hover:underline">
          Ver todas as {list.total} no pipeline
        </Link>
      )}
    </PanelCard>
  )
}

function ActivityCard({
  icon,
  title,
  hint,
  items,
  empty,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  items: ActivitySummaryItem[]
  empty: string
}) {
  return (
    <PanelCard icon={icon} title={title} hint={hint}>
      {items.length === 0 ? (
        <EmptyLine>{empty}</EmptyLine>
      ) : (
        <ul className="divide-y divide-foreground/5">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-2.5">
              <ActivityToggle id={item.id} title={item.title} done={false} />
              <Link href="/atividades" className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{item.title}</span>
                <span
                  className={cn(
                    "block truncate text-xs",
                    item.overdue ? "text-red-700 dark:text-red-300" : "text-muted-foreground"
                  )}
                >
                  {[
                    (item.overdue ? shortDateTime : timeOnly).format(new Date(item.dueDate)),
                    ACTIVITY_TYPE_LABELS[item.type],
                    item.companyName,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  )
}
