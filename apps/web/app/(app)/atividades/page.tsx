import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import {
  ACTIVITY_BUCKETS,
  activitiesHref,
  activityBucket,
  parseActivityFilters,
} from "@/lib/activities/rules"
import { listActivities, type ActivityItem } from "@/lib/activities/service"
import { auth } from "@/lib/auth"
import { getAccessLevel, hasPermission, opportunityScope } from "@/lib/authz/permissions"
import { getDashboardMembers } from "@/lib/dashboard/executive"
import { addDays, dayKey, weekDays, type Day } from "@/lib/dashboard/period"
import { prisma } from "@/lib/db"
import { ownerWhere } from "@/lib/opportunities/board"
import { calendarDateIn, dayRange, startOfCalendarDate } from "@/lib/time/business-calendar"
import { cn } from "@/lib/utils"

import { ActivityFilters } from "./activity-filters"
import { ActivityFormDialog, type ActivityFormOptions } from "./activity-form-dialog"
import { ActivityList } from "./activity-list"

const LIST_LIMIT = 500

const dayLabel = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" })
const asDate = ({ year, month, day }: Day) => new Date(Date.UTC(year, month - 1, day))

export default async function AtividadesPage({
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
        Acesse um cliente para ver as atividades.
      </main>
    )
  }

  const role = session.user.role
  const isSeller = getAccessLevel(role) === "SELLER"
  const canAssign = hasPermission(role, "activities:assign")
  const filters = parseActivityFilters(await searchParams)

  const now = new Date()
  const today = calendarDateIn(now)
  const week = weekDays(today, filters.week)
  const weekWindow = {
    gte: startOfCalendarDate(week[0]),
    lt: startOfCalendarDate(addDays(week[6], 1)),
  }

  const baseWhere = {
    ...(filters.type ? { type: filters.type } : {}),
    ...(isSeller ? {} : ownerWhere(filters.owner, userId)),
  }
  const agenda = filters.view === "agenda"
  const done = filters.status === "concluidas"

  const [activities, members, opportunities, companies, contacts] = await Promise.all([
    listActivities({
      organizationId,
      userId,
      role,
      where: agenda
        ? { ...baseWhere, dueDate: weekWindow }
        : { ...baseWhere, completedAt: done ? { not: null } : null },
      orderBy: !agenda && done ? [{ completedAt: "desc" }] : undefined,
      take: LIST_LIMIT,
    }),
    canAssign ? getDashboardMembers(organizationId) : null,
    prisma.opportunity.findMany({
      where: { organizationId, status: "OPEN", ...opportunityScope(role, userId) },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
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

  const memberOptions = members?.map((member) => ({ id: member.userId, name: member.name })) ?? null
  const options: ActivityFormOptions = {
    opportunities: opportunities.map((item) => ({ id: item.id, name: item.title })),
    companies,
    contacts,
  }
  const listProps = { options, members: memberOptions, userId }

  const range = dayRange(now)
  const bucketOf = (activity: ActivityItem) =>
    activityBucket(
      {
        dueDate: activity.dueDate ? new Date(activity.dueDate) : null,
        completedAt: activity.completedAt ? new Date(activity.completedAt) : null,
      },
      range
    )

  return (
    <main className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Atividades</h1>
          <p className="text-sm text-muted-foreground">
            {isSeller ? "Suas reuniões, follow-ups e tarefas." : "Reuniões, follow-ups e tarefas da equipe."}
          </p>
        </div>
        <ActivityFormDialog options={options} members={memberOptions} userId={userId} />
      </div>

      <ActivityFilters filters={filters} members={memberOptions} />

      {agenda ? (
        <section aria-label="Agenda da semana" className="space-y-3">
          <div className="flex items-center gap-2">
            <Link
              href={activitiesHref(filters, { week: filters.week - 1 })}
              aria-label="Semana anterior"
              className="rounded-lg border border-foreground/10 p-1.5 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={activitiesHref(filters, { week: filters.week + 1 })}
              aria-label="Próxima semana"
              className="rounded-lg border border-foreground/10 p-1.5 text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
            <p className="text-sm text-foreground">
              {dayLabel.format(asDate(week[0]))} a {dayLabel.format(asDate(week[6]))}
            </p>
            {filters.week !== 0 && (
              <Link href={activitiesHref(filters, { week: 0 })} className="text-sm text-gold-fg hover:underline">
                Esta semana
              </Link>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {week.map((day) => {
              const key = dayKey(day)
              const items = activities.filter(
                (item) => item.dueDate && dayKey(calendarDateIn(new Date(item.dueDate))) === key
              )
              return (
                <Card
                  key={key}
                  data-day={key}
                  className={cn(
                    "border-foreground/5 bg-card py-0",
                    key === dayKey(today) && "border-[#D4A64F]/50"
                  )}
                >
                  <CardContent className="p-4">
                    <h2 className="text-sm font-semibold capitalize text-foreground">{dayLabel.format(asDate(day))}</h2>
                    {items.length === 0 ? (
                      <p className="py-1 text-xs text-muted-foreground">Nada agendado.</p>
                    ) : (
                      <ActivityList activities={items} {...listProps} />
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      ) : activities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-foreground/10 p-8 text-center text-sm text-muted-foreground">
          {done ? "Nenhuma atividade concluída." : "Nenhuma atividade pendente."}
        </p>
      ) : (
        ACTIVITY_BUCKETS.map((bucket) => {
          const items = activities.filter((activity) => bucketOf(activity) === bucket.key)
          if (items.length === 0) return null
          return (
            <Card key={bucket.key} className="border-foreground/5 bg-card py-0">
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  {bucket.label} ({items.length})
                </h2>
                <ActivityList activities={items} overdue={bucket.key === "overdue"} {...listProps} />
              </CardContent>
            </Card>
          )
        })
      )}
    </main>
  )
}
