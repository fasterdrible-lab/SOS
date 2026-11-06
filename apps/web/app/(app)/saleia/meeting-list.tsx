import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { INSIGHT_LABELS, INSIGHT_ORDER } from "@/lib/saleia/rules"
import type { SaleiaMeetingItem } from "@/lib/saleia/service"
import { BUSINESS_TIME_ZONE } from "@/lib/time/business-calendar"

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export const formatMeetingDate = (iso: string) => dateTime.format(new Date(iso))

/** Reunioes recebidas do SALE-IA: na tela SALEIA, na empresa e na negociacao. */
export function MeetingList({
  meetings,
  showLinks = true,
}: {
  meetings: SaleiaMeetingItem[]
  /** Falso quando a pagina ja e da empresa ou da negociacao. */
  showLinks?: boolean
}) {
  return (
    <ul className="divide-y divide-foreground/5">
      {meetings.map((meeting) => {
        const counts = INSIGHT_ORDER.map((kind) => ({
          kind,
          count: meeting.insights.filter((insight) => insight.kind === kind).length,
        })).filter((entry) => entry.count > 0)

        const links = showLinks
          ? [
              meeting.opportunity && (
                <Link key="opportunity" href={`/pipeline/${meeting.opportunity.id}`} className="hover:text-gold-fg">
                  {meeting.opportunity.title}
                </Link>
              ),
              meeting.company && (
                <Link key="company" href={`/empresas/${meeting.company.id}`} className="hover:text-gold-fg">
                  {meeting.company.name}
                </Link>
              ),
              !meeting.company && !meeting.opportunity && <span key="none">Sem vínculo no CRM</span>,
            ].filter(Boolean)
          : []

        return (
          <li key={meeting.id} className="space-y-1 py-3" data-meeting={meeting.id}>
            <Link href={`/saleia/${meeting.id}`} className="block min-w-0 break-words text-sm font-medium text-foreground hover:text-gold-fg">
              {meeting.title}
            </Link>
            <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
              <span>{formatMeetingDate(meeting.startedAt)}</span>
              {meeting.durationMinutes !== null && <span>{meeting.durationMinutes} min</span>}
              {links}
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{meeting.summary}</p>
            {counts.length > 0 && (
              <p className="flex flex-wrap gap-1 pt-0.5">
                {counts.map(({ kind, count }) => (
                  <Badge key={kind} variant="outline" className="text-[10px]">
                    {INSIGHT_LABELS[kind]}: {count}
                  </Badge>
                ))}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
