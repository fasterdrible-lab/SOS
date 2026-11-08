import Link from "next/link"
import { notFound } from "next/navigation"

import { AccessDenied } from "@/components/access-denied"
import { Card, CardContent } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { dayKey } from "@/lib/dashboard/period"
import { resolveReportSubject } from "@/lib/report/access"
import { dayNavigation, parseDayKey, resolveReportDay } from "@/lib/report/rules"
import {
  getDailyReport,
  listClosedReports,
  type ClosedReport,
  type ReportListItem,
} from "@/lib/report/service"
import { BUSINESS_TIME_ZONE, calendarDateIn } from "@/lib/time/business-calendar"

import { CloseDayForm } from "./close-day-form"
import { ReportFilters } from "./report-filters"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const timeOnly = new Intl.DateTimeFormat("pt-BR", { timeZone: BUSINESS_TIME_ZONE, hour: "2-digit", minute: "2-digit" })
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})
const longDay = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" })
const shortDay = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })

/** Data do calendario (AAAA-MM-DD) como meio-dia UTC, so para formatar. */
const asDate = (key: string) => new Date(`${key}T12:00:00Z`)
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

type Query = Promise<Record<string, string | string[] | undefined>>
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function ReportPage({ searchParams }: { searchParams: Query }) {
  const session = await auth()
  const organizationId = session?.user?.organizationId
  const userId = session?.user?.id
  if (!organizationId || !userId) notFound()
  if (!hasPermission(session.user.role, "reports:read")) return <AccessDenied />

  const query = await searchParams
  const tab = first(query.aba) === "fechados" ? "fechados" : "dia"
  const today = calendarDateIn(new Date())
  const subject = await resolveReportSubject({
    organizationId,
    userId,
    role: session.user.role,
    requested: first(query.vendedor),
  })
  const sellerId = subject.invalid || subject.subjectId === userId ? null : subject.subjectId
  const members = subject.members?.filter((member) => member.userId !== userId) ?? null

  const day = resolveReportDay(first(query.dia), today)
  const navigation = dayNavigation(day, today)
  const filters = (
    <ReportFilters
      tab={tab}
      day={dayKey(day)}
      today={dayKey(today)}
      previous={navigation.previous}
      next={navigation.next}
      sellerId={sellerId}
      members={members}
    />
  )

  if (tab === "fechados") {
    const reports = await listClosedReports({ organizationId, userId, role: session.user.role, sellerId })
    return (
      <main className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
        {filters}
        <ClosedList reports={reports} showPerson={members !== null && !sellerId} />
      </main>
    )
  }

  const report = await getDailyReport({ organizationId, userId: subject.subjectId, day })
  const isOwn = subject.subjectId === userId
  const personName = members?.find((member) => member.userId === subject.subjectId)?.name
  const numbers = report.closed ?? report.live

  return (
    <main className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
      {filters}

      <p className="text-sm text-muted-foreground">
        <span className="capitalize">{longDay.format(asDate(report.day))}</span>
        {personName && <span> · dia de {personName}</span>}
        {report.closed ? (
          <span> · fechado em {dateTime.format(new Date(report.closed.closedAt))}</span>
        ) : (
          <span> · em aberto</span>
        )}
      </p>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Números do dia">
        <Stat
          title="Reuniões realizadas"
          value={numbers.meetingsDone}
          detail={report.live.saleiaMeetings > 0 ? plural(report.live.saleiaMeetings, "analisada pelo SALEIA", "analisadas pelo SALEIA") : "Reuniões concluídas em Atividades"}
        />
        <Stat title="FUPs" value={numbers.followUpsDone} detail="Follow-ups, ligações e e-mails concluídos" />
        <Stat title="Negociações avançadas" value={numbers.advancedDeals} detail="Foram para uma etapa à frente" />
        <Stat title="Vendas" value={numbers.salesCount} detail={brl.format(numbers.salesRevenue)} />
        <Stat
          title="Pendentes do dia"
          value={numbers.pendingCount}
          detail="Atividades com data no dia, não concluídas"
          alert={numbers.pendingCount > 0}
        />
      </section>

      {report.closed && (
        <p className="text-xs text-muted-foreground">
          Os números acima são os registrados no fechamento. As listas abaixo mostram o dia como está agora.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard title="Reuniões realizadas" items={report.lists.meetings} empty="Nenhuma reunião concluída no dia." />
        <ListCard title="Reuniões analisadas pelo SALEIA" items={report.lists.saleiaMeetings} empty="Nenhuma reunião analisada no dia." />
        <ListCard title="FUPs" items={report.lists.followUps} empty="Nenhum follow-up concluído no dia." />
        <ListCard title="Negociações avançadas" items={report.lists.advanced} empty="Nenhuma negociação avançou no dia." />
        <ListCard title="Vendas" items={report.lists.sales} empty="Nenhuma venda no dia." money />
        <ListCard title="Pendentes do dia" items={report.lists.pending} empty="Nada pendente com data no dia." alert />
      </div>

      <Card className="border-foreground/5 bg-card py-0">
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-foreground">Fechamento do dia</h2>
          {report.closed ? (
            <div className="space-y-1 text-sm">
              <p className="text-foreground">Dia fechado em {dateTime.format(new Date(report.closed.closedAt))}.</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{report.closed.notes ?? "Sem observações."}</p>
            </div>
          ) : isOwn ? (
            <CloseDayForm day={report.day} pendingCount={report.live.pendingCount} />
          ) : (
            <p className="text-sm text-muted-foreground">Este dia ainda não foi fechado. Cada pessoa fecha o próprio dia.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function Stat({ title, value, detail, alert }: { title: string; value: number; detail: string; alert?: boolean }) {
  return (
    <Card className="border-foreground/5 bg-card py-0">
      <CardContent className="space-y-1 p-5">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{title}</p>
        <p className={alert ? "text-2xl font-semibold text-amber-700 dark:text-amber-300" : "text-2xl font-semibold text-foreground"}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function ListCard({
  title,
  items,
  empty,
  money,
  alert,
}: {
  title: string
  items: ReportListItem[]
  empty: string
  money?: boolean
  alert?: boolean
}) {
  return (
    <Card className="border-foreground/5 bg-card py-0">
      <CardContent className="space-y-2 p-5">
        <h2 className="text-sm font-semibold text-foreground">
          {title} ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="py-1 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y divide-foreground/5">
            {items.map((item) => {
              const body = (
                <>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">{item.title}</span>
                    <span className={alert ? "block truncate text-xs text-amber-700 dark:text-amber-300" : "block truncate text-xs text-muted-foreground"}>
                      {[item.at ? timeOnly.format(new Date(item.at)) : null, item.detail].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {money && item.value !== undefined && (
                    <span className="shrink-0 text-sm font-medium text-gold-fg">{brl.format(item.value)}</span>
                  )}
                </>
              )
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className="flex items-start justify-between gap-3 py-2.5 hover:text-foreground">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-start justify-between gap-3 py-2.5">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function ClosedList({ reports, showPerson }: { reports: ClosedReport[]; showPerson: boolean }) {
  if (reports.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-foreground/10 p-6 text-center text-sm text-muted-foreground">
        Nenhum dia fechado ainda.
      </p>
    )
  }

  return (
    <Card className="border-foreground/5 bg-card py-0">
      <CardContent className="p-0">
        <ul className="divide-y divide-foreground/5">
          {reports.map((report) => (
            <li key={report.id}>
              <Link
                href={`/report?dia=${report.day}${showPerson ? `&vendedor=${report.userId}` : ""}`}
                className="block space-y-1 px-5 py-3 hover:bg-foreground/[0.02]"
              >
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-medium capitalize text-foreground">
                    {parseDayKey(report.day) ? shortDay.format(asDate(report.day)) : report.day}
                  </span>
                  {showPerson && <span className="text-muted-foreground">{report.userName}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[
                    plural(report.meetingsDone, "reunião", "reuniões"),
                    plural(report.followUpsDone, "FUP", "FUPs"),
                    plural(report.advancedDeals, "avançada", "avançadas"),
                    `${plural(report.salesCount, "venda", "vendas")} (${brl.format(report.salesRevenue)})`,
                    report.pendingCount > 0 ? plural(report.pendingCount, "pendente", "pendentes") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {report.notes && <p className="line-clamp-2 text-xs text-foreground/80">{report.notes}</p>}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
