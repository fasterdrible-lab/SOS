import Link from "next/link"
import {
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  HeartPulse,
  Megaphone,
  Target,
  UsersRound,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { AccessDenied } from "@/components/access-denied"
import { auth } from "@/lib/auth"
import { assigneeScope, getAccessLevel, hasPermission, isTeamManager } from "@/lib/authz/permissions"
import {
  getDashboardMembers,
  getExecutiveDashboard,
  resolveSellerFilter,
  type ExecutiveDashboard,
  type GoalRow,
} from "@/lib/dashboard/executive"
import type { RankedGroups } from "@/lib/dashboard/metrics"
import { parsePeriod } from "@/lib/dashboard/period"
import { prisma } from "@/lib/db"
import { COOLING_AFTER_DAYS } from "@/lib/meu-dia/summary"
import { getPipelines } from "@/lib/pipelines/service"
import { BUSINESS_TIME_ZONE } from "@/lib/time/business-calendar"
import { cn } from "@/lib/utils"

import { DashboardFilters } from "./dashboard-filters"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const brlShort = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
})
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })
const monthName = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  month: "long",
  year: "numeric",
})
const shortDate = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" })

const percentText = (value: number | null) => (value === null ? "—" : `${number.format(value)}%`)
const isoDay = (day: string) => shortDate.format(new Date(`${day}T00:00:00Z`))

export default async function DashboardPage({
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
        Acesse um cliente para ver o dashboard.
      </main>
    )
  }

  const role = session.user.role
  if (!hasPermission(role, "dashboard:read")) return <AccessDenied />

  const query = await searchParams
  const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)
  const period = parsePeriod(single(query.periodo))
  const isSeller = getAccessLevel(role) === "SELLER"

  const [members, pipelines, diagnostics] = await Promise.all([
    getDashboardMembers(organizationId, assigneeScope(session.user.role, session.user.teamId).teamId),
    getPipelines(organizationId),
    prisma.diagnostic.count({ where: { organizationId } }),
  ])
  const { sellerId } = resolveSellerFilter(role, members, single(query.vendedor))
  const requestedPipeline = single(query.funil)
  const pipelineId = pipelines.some((pipeline) => pipeline.id === requestedPipeline)
    ? requestedPipeline!
    : null
  const dashboard = await getExecutiveDashboard({
    organizationId,
    userId,
    role,
    teamId: session.user.teamId,
    period,
    sellerId,
    members,
    pipelines,
    pipelineId,
  })

  const scopeLabel =
    dashboard.scope === "OWN"
      ? "Suas negociações"
      : dashboard.scope === "SELLER"
        ? members.find((member) => member.userId === dashboard.sellerId)?.name
        : isTeamManager(role, session.user.teamId)
          ? "Sua equipe e negociações sem responsável"
          : "Toda a organização"

  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6">
      <DashboardFilters
        period={period}
        sellerId={sellerId}
        members={isSeller ? null : members}
        pipelineId={pipelineId}
        pipelines={pipelines.map((pipeline) => ({ id: pipeline.id, name: pipeline.name }))}
      />

      <p className="px-1 text-xs text-muted-foreground">
        {scopeLabel} · {dashboard.period.label.toLowerCase()} ({isoDay(dashboard.period.start)} a{" "}
        {isoDay(dashboard.period.end)}), comparado ao período anterior equivalente.
      </p>

      <Indicators dashboard={dashboard} />

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Funil, saúde e metas">
        <FunnelCard dashboard={dashboard} severalPipelines={pipelines.length > 1} />
        <HealthCard dashboard={dashboard} />
        <GoalsCard month={dashboard.goals.month} rows={dashboard.goals.rows} />
      </section>

      <section className="grid gap-4 lg:grid-cols-4" aria-label="Time, origem e perdas">
        {dashboard.team && <TeamCard dashboard={dashboard} />}
        <RankCard
          icon={Megaphone}
          title="Origem da venda"
          hint="Vendas do período pela origem do lead."
          data={dashboard.origins}
          empty="Nenhuma venda no período."
          othersLabel="origens"
        />
        <RankCard
          icon={XCircle}
          title="Motivos de perda"
          hint={`${dashboard.winRate.lost} perdidas no período.`}
          data={dashboard.lossReasons}
          empty="Nenhuma perda no período."
          othersLabel="motivos"
          tone="loss"
        />
      </section>

      {diagnostics === 0 && (
        <Card className="border-dashed border-foreground/10 bg-transparent py-0">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Comece com um Diagnóstico Comercial</p>
              <p className="text-sm text-muted-foreground">
                O SalesOS avalia a operação e gera um plano de crescimento a partir dos seus dados.
              </p>
            </div>
            <Link
              href="/diagnostico"
              className="inline-flex items-center gap-2 rounded-lg bg-[#D4A64F] px-4 py-2 text-sm font-semibold text-[#1E1B3A] transition-colors hover:bg-[#E0B85A]"
            >
              Iniciar diagnóstico
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

function Indicators({ dashboard }: { dashboard: ExecutiveDashboard }) {
  const { revenue, wonCount, averageTicket, winRate, pace } = dashboard
  const paceMonth = monthName.format(new Date(`${pace.month}-15T12:00:00Z`))

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6" aria-label="Indicadores do período">
      <Card className="border-foreground/5 bg-card py-0 md:col-span-2">
        <CardContent className="space-y-2 p-5">
          <Label tone="gold">Faturamento</Label>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{brl.format(revenue.value)}</p>
          <Delta change={revenue.change} />
          <Sparkline values={revenue.daily} />
        </CardContent>
      </Card>

      <StatCard title="No ritmo, o mês fecha" value={pace.projection === null ? "—" : brlCompact.format(pace.projection)}>
        <Delta change={pace.changeVsAverage} label="vs. média de 3 meses" />
        <p className="text-xs text-muted-foreground">
          {paceMonth} · dia útil {pace.businessDays.elapsed} de {pace.businessDays.total}
          {pace.goal !== null ? ` · meta ${brlCompact.format(pace.goal)}` : " · sem meta"}
        </p>
        <p className="text-xs text-muted-foreground/80">mês corrente, fora do filtro</p>
      </StatCard>

      <StatCard title="Vendas ganhas" value={String(wonCount.value)}>
        <Delta change={wonCount.change} />
      </StatCard>

      <StatCard title="Ticket médio" value={averageTicket.value === null ? "—" : brl.format(averageTicket.value)}>
        <Delta change={averageTicket.change} />
      </StatCard>

      <StatCard title="Taxa de ganho" value={percentText(winRate.value)}>
        <Delta change={winRate.changePp} unit="pp" />
        <p className="text-xs text-muted-foreground">
          {winRate.lost === 1 ? "1 perdida" : `${winRate.lost} perdidas`} no período
        </p>
      </StatCard>
    </section>
  )
}

function FunnelCard({
  dashboard,
  severalPipelines,
}: {
  dashboard: ExecutiveDashboard
  severalPipelines: boolean
}) {
  const { steps, leads, pipelineName } = dashboard.funnel
  const max = Math.max(1, ...steps.map((step) => step.count))

  return (
    <PanelCard
      icon={Filter}
      title={`Funil do período · ${pipelineName}`}
      hint={`Negociações que chegaram a cada etapa, ou além, no período · % da etapa de cima.${
        severalPipelines && !dashboard.pipelineId ? " Com todos os funis, mostra o funil padrão." : ""
      }`}
    >
      {leads !== null && (
        <p className="text-xs text-muted-foreground">
          Leads criados no período: <span className="font-medium text-foreground">{leads}</span>
        </p>
      )}
      <ul className="space-y-2.5 pt-1">
        {steps.map((step) => (
          <li key={step.id} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate text-foreground">{step.name}</span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{step.count}</span>
                {step.percentOfPrevious !== null && ` · ${number.format(step.percentOfPrevious)}%`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-foreground/5">
              <div
                className="h-full rounded-full bg-[#D4A64F]"
                style={{ width: `${(step.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </PanelCard>
  )
}

function HealthCard({ dashboard }: { dashboard: ExecutiveDashboard }) {
  const { health } = dashboard
  const items = [
    {
      label: "Ciclo de venda",
      value: health.salesCycleDays === null ? "—" : `${number.format(health.salesCycleDays)} d`,
      detail: "da criação ao ganho, vendas do período",
    },
    {
      label: "Pipeline aberto",
      value: brlShort.format(health.openValue),
      detail: health.openCount === 1 ? "1 negociação aberta" : `${health.openCount} negociações abertas`,
    },
    {
      label: "Esfriando",
      value: String(health.cooling),
      detail: `paradas há mais de ${COOLING_AFTER_DAYS} dias`,
      alert: health.cooling > 0,
    },
    {
      label: "Fechamento vencido",
      value: String(health.overdueClose),
      detail: "abertas com data prevista já passada",
      alert: health.overdueClose > 0,
    },
  ]

  return (
    <PanelCard icon={HeartPulse} title="Saúde do pipeline" hint="Ciclo do período; o restante é agora.">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 pt-1">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {item.label}
            </dt>
            <dd
              className={cn(
                "text-xl font-semibold tracking-tight",
                item.alert ? "text-red-700 dark:text-red-300" : "text-foreground"
              )}
            >
              {item.value}
            </dd>
            <dd className="text-xs text-muted-foreground">{item.detail}</dd>
          </div>
        ))}
      </dl>
    </PanelCard>
  )
}

function GoalsCard({ month, rows }: { month: string; rows: GoalRow[] }) {
  const label = monthName.format(new Date(`${month}-15T12:00:00Z`))

  return (
    <PanelCard
      icon={Target}
      title={`Metas de ${label}`}
      hint="Mês corrente, fora do filtro · traço = ideal para hoje."
    >
      {rows.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">
          Nenhuma meta definida para o mês. Gestores definem as metas no{" "}
          <Link href="/meu-dia" className="text-gold-fg hover:underline">
            Meu Dia
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3 pt-1">
          {rows.map((row) => {
            const { progress } = row
            const ideal =
              progress.goal && progress.idealToDate !== null ? (progress.idealToDate / progress.goal) * 100 : null
            const behind = progress.gapToIdeal !== null && progress.gapToIdeal > 0
            return (
              <li key={row.userId ?? "equipe"} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-foreground">{row.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {brlCompact.format(progress.revenue)} / {brlCompact.format(progress.goal ?? 0)}{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        behind ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"
                      )}
                    >
                      {percentText(progress.percent)}
                    </span>
                  </span>
                </div>
                <ProgressBar percent={progress.percent ?? 0} ideal={ideal} />
              </li>
            )
          })}
        </ul>
      )}
    </PanelCard>
  )
}

function TeamCard({ dashboard }: { dashboard: ExecutiveDashboard }) {
  const rows = dashboard.team ?? []

  return (
    <div className="min-w-0 lg:col-span-2">
      <PanelCard
        icon={UsersRound}
        title="Time"
        hint="Pelo dono da negociação · conversão = ganhas ÷ encerradas no período · meta do mês corrente."
      >
        {rows.length === 0 ? (
          <p className="py-1 text-sm text-muted-foreground">Nenhuma venda ou perda no período.</p>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-1 py-2 font-medium">Pessoa</th>
                  <th className="px-1 py-2 text-right font-medium">Vendas</th>
                  <th className="px-1 py-2 text-right font-medium">Conv.</th>
                  <th className="px-1 py-2 text-right font-medium">Ticket</th>
                  <th className="px-1 py-2 text-right font-medium">Fatur.</th>
                  <th className="px-1 py-2 text-right font-medium">Meta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {rows.map((row) => (
                  <tr key={row.userId ?? "sem-responsavel"}>
                    <td className="max-w-40 truncate px-1 py-2 text-foreground">{row.name}</td>
                    <td className="px-1 py-2 text-right text-foreground">{row.won}</td>
                    <td className="px-1 py-2 text-right text-muted-foreground">{percentText(row.conversionRate)}</td>
                    <td className="px-1 py-2 text-right text-muted-foreground">
                      {row.averageTicket === null ? "—" : brlCompact.format(row.averageTicket)}
                    </td>
                    <td className="px-1 py-2 text-right font-medium text-foreground">
                      {brlShort.format(row.revenue)}
                    </td>
                    <td className="px-1 py-2 text-right text-muted-foreground">{percentText(row.goalPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  )
}

function RankCard({
  icon,
  title,
  hint,
  data,
  empty,
  othersLabel,
  tone,
}: {
  icon: LucideIcon
  title: string
  hint: string
  data: RankedGroups
  empty: string
  othersLabel: string
  tone?: "loss"
}) {
  const rows = [
    ...data.groups,
    ...(data.others
      ? [{ ...data.others, label: `Demais ${data.others.groupCount} ${othersLabel}` }]
      : []),
  ]

  return (
    <PanelCard icon={icon} title={title} hint={hint}>
      {rows.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3 pt-1">
          {rows.map((row) => (
            <li key={row.label} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-foreground" title={row.label}>
                  {row.label}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {row.count} · {number.format(row.share)}% · {brlCompact.format(row.value)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-foreground/5">
                <div
                  className={cn("h-full rounded-full", tone === "loss" ? "bg-red-500/70" : "bg-[#D4A64F]")}
                  style={{ width: `${row.share}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  )
}

function Label({ children, tone }: { children: React.ReactNode; tone?: "gold" }) {
  return (
    <p
      className={cn(
        "text-[11px] font-medium uppercase tracking-widest",
        tone === "gold" ? "text-gold-fg" : "text-muted-foreground"
      )}
    >
      {children}
    </p>
  )
}

function StatCard({ title, value, children }: { title: string; value: string; children?: React.ReactNode }) {
  return (
    <Card className="border-foreground/5 bg-card py-0">
      <CardContent className="space-y-2 p-5">
        <Label>{title}</Label>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        {children}
      </CardContent>
    </Card>
  )
}

function Delta({
  change,
  unit = "%",
  label = "vs. período anterior",
}: {
  change: number | null
  unit?: "%" | "pp"
  label?: string
}) {
  if (change === null) {
    return <p className="text-xs text-muted-foreground">sem base de comparação</p>
  }
  const positive = change >= 0
  const Arrow = positive ? ArrowUpRight : ArrowDownRight
  return (
    <p className="flex items-center gap-1 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium",
          positive ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}
      >
        <Arrow className="h-3 w-3" />
        {positive ? "+" : "−"}
        {number.format(Math.abs(change))}
        {unit}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </p>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2 || values.every((value) => value === 0)) {
    return <div className="h-10" aria-hidden />
  }
  const max = Math.max(...values)
  const step = 100 / (values.length - 1)
  const points = values.map((value, index) => `${index * step},${38 - (value / max) * 34}`).join(" ")

  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-full" aria-label="Faturamento por dia">
      <polyline
        points={points}
        fill="none"
        stroke="#D4A64F"
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function ProgressBar({ percent, ideal }: { percent: number; ideal: number | null }) {
  const clamp = (value: number) => Math.min(Math.max(value, 0), 100)
  return (
    <div className="relative h-1.5 w-full rounded-full bg-foreground/10">
      <div className="h-full rounded-full bg-[#D4A64F]" style={{ width: `${clamp(percent)}%` }} />
      {ideal !== null && (
        <div
          className="absolute -top-1 h-3.5 w-0.5 rounded bg-foreground/70"
          style={{ left: `calc(${clamp(ideal)}% - 1px)` }}
          title="Ideal para hoje"
          aria-hidden
        />
      )}
    </div>
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
    <Card className="h-full min-w-0 border-foreground/5 bg-card py-0">
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
