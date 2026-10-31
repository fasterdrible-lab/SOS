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

import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import {
  COOLING_AFTER_DAYS,
  getMyDaySummary,
  type OpportunityItem,
  type OpportunityList,
} from "@/lib/meu-dia/summary"
import type { OpportunityStage } from "@/lib/opportunities/rules"
import { BUSINESS_TIME_ZONE } from "@/lib/time/business-calendar"
import { ORGANIZATION_GOAL_SCOPE } from "@/lib/validations/goal"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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

const STAGE_LABELS: Record<OpportunityStage, string> = {
  PROSPECTING: "Prospecção",
  QUALIFICATION: "Qualificação",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociação",
  CLOSED_WON: "Ganha",
  CLOSED_LOST: "Perdida",
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Administrador",
  ADMIN: "Administrador",
  CONSULTANT: "Consultor",
  MANAGER: "Gestor",
  MEMBER: "Vendedor",
}

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
  const now = new Date()
  const summary = await getMyDaySummary({ organizationId, userId, role, now })
  const goalEditor = hasPermission(role, "goals:manage")
    ? await loadGoalMembers(organizationId, summary.month)
    : null

  const month = monthName.format(now)
  const monthLabel = month.charAt(0).toUpperCase() + month.slice(1)
  const { goal } = summary
  const closedCount = summary.wonCount + summary.lostCount

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-white/5 bg-card px-4 py-3">
        <p className="text-sm text-white">
          <span className="font-semibold">Ações do dia</span>
          <span className="ml-2 text-muted-foreground">{longDate.format(now)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {summary.scope === "OWN" ? "Suas negociações" : "Toda a organização"}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores do mês">
        <Card className="border-white/5 bg-card py-0 md:col-span-2">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-widest text-[#D4A64F]">
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
              <span className="text-3xl font-semibold tracking-tight text-white">
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
          describe={(item) => `${days(item.daysInStage)} em ${STAGE_LABELS[item.stage].toLowerCase()}`}
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
            <ul className="divide-y divide-white/5">
              {summary.tasks.items.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/planos/${task.planId}`}
                    className="flex items-start justify-between gap-3 py-2.5 hover:text-white"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-white">{task.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {task.planTitle}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        task.overdue ? "text-red-300" : "text-[#D4A64F]"
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
              <Link href="/sdr" className="block py-1 text-sm text-white hover:text-[#D4A64F]">
                {summary.hotLeads === 1
                  ? "1 lead qualificado ainda não visto"
                  : `${summary.hotLeads} leads qualificados ainda não vistos`}{" "}
                →
              </Link>
            )}
          </PanelCard>
        )}

        <UpcomingCard
          icon={CalendarClock}
          title="Reuniões de hoje"
          text="Aparecem aqui quando o módulo Atividades estiver disponível."
        />
        <UpcomingCard
          icon={MessagesSquare}
          title="Follow-ups pendentes"
          text="Aparecem aqui quando o módulo Atividades estiver disponível."
        />
        <UpcomingCard
          icon={ClipboardCheck}
          title="Fechar o dia"
          text="As pendências do fechamento diário chegam com o Report Diário."
        />
      </section>

      <section aria-label="Inteligência SALEIA">
        <Card className="border-dashed border-white/10 bg-transparent py-0">
          <CardContent className="flex items-start gap-3 p-5">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#D4A64F]" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">Recomendações da SALEIA</p>
              <p className="text-sm text-muted-foreground">
                A integração com a SALEIA ainda não está conectada. Quando estiver, as
                recomendações das reuniões aparecem aqui com origem, data e evidência.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function GoalBar({ percent: value, idealPercent }: { percent: number; idealPercent: number | null }) {
  const clamp = (number: number) => Math.min(Math.max(number, 0), 100)

  return (
    <div
      className="relative h-2 w-full rounded-full bg-white/10"
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
          className="absolute -top-1 h-4 w-0.5 rounded bg-white/70"
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
      <p className="text-sm font-medium text-red-300">
        Faltam {brl.format(gap)} para o ideal de hoje
      </p>
    )
  }
  return (
    <p className="text-sm font-medium text-emerald-300">
      {gap === 0 ? "No ritmo ideal de hoje" : `${brl.format(-gap)} acima do ideal de hoje`}
    </p>
  )
}

function StatCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card className="border-white/5 bg-card py-0">
      <CardContent className="space-y-2 p-5">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
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
    <Card className="border-white/5 bg-card py-0">
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#D4A64F]" />
          <h2 className="text-sm font-semibold text-white">{title}</h2>
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
        <ul className="divide-y divide-white/5">
          {list.items.map((item) => (
            <li key={item.id}>
              <Link
                href="/pipeline"
                className="flex items-start justify-between gap-3 py-2.5 hover:text-white"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-white">{item.title}</span>
                  <span
                    className={cn(
                      "block truncate text-xs",
                      tone === "alert" ? "text-red-300" : "text-muted-foreground"
                    )}
                  >
                    {[item.companyName, describe(item)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-[#D4A64F]">
                  {brlShort.format(item.value)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {list.total > list.items.length && (
        <Link href="/pipeline" className="block pt-1 text-xs text-[#D4A64F] hover:underline">
          Ver todas as {list.total} no pipeline
        </Link>
      )}
    </PanelCard>
  )
}

function UpcomingCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <Card className="border-dashed border-white/10 bg-transparent py-0">
      <CardContent className="space-y-1 p-5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        </div>
        <p className="text-xs text-muted-foreground/80">{text}</p>
      </CardContent>
    </Card>
  )
}
