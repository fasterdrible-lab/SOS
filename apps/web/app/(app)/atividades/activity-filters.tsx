"use client"

import { useRouter } from "next/navigation"
import { CalendarDays, LayoutList } from "lucide-react"

import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  activitiesHref,
  type ActivityFilters as Filters,
  type ActivityStatusFilter,
  type ActivityType,
} from "@/lib/activities/rules"
import { cn } from "@/lib/utils"

const selectClass =
  "h-8 rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"

export function ActivityFilters({
  filters,
  members,
}: {
  filters: Filters
  /** Nulo para o vendedor, que so ve as proprias. */
  members: { id: string; name: string }[] | null
}) {
  const router = useRouter()
  const go = (change: Partial<Filters>) => router.push(activitiesHref(filters, change))

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-foreground/5 bg-card px-3 py-2">
      {filters.view === "lista" && (
        <select
          value={filters.status}
          onChange={(event) => go({ status: event.target.value as ActivityStatusFilter })}
          aria-label="Status"
          className={selectClass}
        >
          <option value="pendentes">Pendentes</option>
          <option value="concluidas">Concluídas</option>
        </select>
      )}

      <select
        value={filters.type ?? ""}
        onChange={(event) => go({ type: (event.target.value || null) as ActivityType | null })}
        aria-label="Tipo"
        className={selectClass}
      >
        <option value="">Todos os tipos</option>
        {ACTIVITY_TYPES.map((type) => (
          <option key={type} value={type}>{ACTIVITY_TYPE_LABELS[type]}</option>
        ))}
      </select>

      {members && (
        <select
          value={filters.owner}
          onChange={(event) => go({ owner: event.target.value })}
          aria-label="Responsável"
          className={selectClass}
        >
          <option value="todos">Toda a equipe</option>
          <option value="meus">Minhas atividades</option>
          <option value="sem-dono">Sem responsável</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
      )}

      <div className="ml-auto flex rounded-lg border border-foreground/10 p-0.5" role="group" aria-label="Visão">
        {(
          [
            ["lista", "Lista", LayoutList],
            ["agenda", "Agenda", CalendarDays],
          ] as const
        ).map(([view, label, Icon]) => (
          <button
            key={view}
            type="button"
            onClick={() => go({ view })}
            aria-pressed={filters.view === view}
            aria-label={label}
            title={label}
            className={cn(
              "flex h-7 w-8 items-center justify-center rounded-md transition-colors",
              filters.view === view ? "bg-[#D4A64F]/15 text-gold-fg" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  )
}
