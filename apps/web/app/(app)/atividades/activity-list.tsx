import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { ACTIVITY_TYPE_LABELS } from "@/lib/activities/rules"
import type { ActivityItem } from "@/lib/activities/service"
import { BUSINESS_TIME_ZONE } from "@/lib/time/business-calendar"
import { cn } from "@/lib/utils"

import { ActivityFormDialog, type ActivityFormOptions } from "./activity-form-dialog"
import { ActivityToggle } from "./activity-toggle"

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

/** Linhas de atividade, usadas na agenda, na negociacao e na empresa. */
export function ActivityList({
  activities,
  options,
  members,
  userId,
  overdue,
}: {
  activities: ActivityItem[]
  options: ActivityFormOptions | null
  members: { id: string; name: string }[] | null
  userId: string
  overdue?: boolean
}) {
  return (
    <ul className="divide-y divide-foreground/5">
      {activities.map((activity) => {
        const links = [
          activity.opportunity && (
            <Link key="opportunity" href={`/pipeline/${activity.opportunity.id}`} className="hover:text-gold-fg">
              {activity.opportunity.title}
            </Link>
          ),
          activity.company && (
            <Link key="company" href={`/empresas/${activity.company.id}`} className="hover:text-gold-fg">
              {activity.company.name}
            </Link>
          ),
          activity.contact && <span key="contact">{activity.contact.name}</span>,
          activity.owner && members && <span key="owner">{activity.owner.name}</span>,
        ].filter(Boolean)

        return (
          <li key={activity.id} className="flex items-start gap-3 py-2.5" data-activity={activity.id}>
            <ActivityToggle id={activity.id} title={activity.title} done={Boolean(activity.completedAt)} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={cn(
                    "min-w-0 break-words text-sm text-foreground",
                    activity.completedAt && "text-muted-foreground line-through"
                  )}
                >
                  {activity.title}
                </span>
                <Badge variant="outline" className="shrink-0">{ACTIVITY_TYPE_LABELS[activity.type]}</Badge>
              </p>
              {activity.dueDate && (
                <p className={cn("text-xs", overdue ? "text-red-700 dark:text-red-300" : "text-muted-foreground")}>
                  {dateTime.format(new Date(activity.dueDate))}
                </p>
              )}
              {links.length > 0 && (
                <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">{links}</p>
              )}
              {activity.description && (
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">{activity.description}</p>
              )}
            </div>
            <ActivityFormDialog activity={activity} options={options} members={members} userId={userId} />
          </li>
        )
      })}
    </ul>
  )
}
