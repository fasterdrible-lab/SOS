"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { KanbanSquare, LayoutList, Search } from "lucide-react"

import {
  BOARD_SORTS,
  BOARD_STATUSES,
  boardHref,
  type BoardFilters as Filters,
  type BoardSortKey,
  type BoardStatusKey,
} from "@/lib/opportunities/board"
import { cn } from "@/lib/utils"

const selectClass =
  "h-8 rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"

export function BoardFilters({
  filters,
  pipelines,
  members,
}: {
  filters: Filters
  pipelines: { id: string; name: string }[]
  /** Nulo para o vendedor, que so ve as proprias negociacoes. */
  members: { userId: string; name: string }[] | null
}) {
  const router = useRouter()
  const [query, setQuery] = useState(filters.query)

  const go = (change: Partial<Filters>) => router.push(boardHref(filters, change))

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    go({ query: query.trim() })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-foreground/5 bg-card px-3 py-2">
      {pipelines.length > 1 && (
        <select
          value={filters.pipelineId || pipelines[0].id}
          onChange={(event) => go({ pipelineId: event.target.value })}
          aria-label="Funil"
          className={selectClass}
        >
          {pipelines.map((pipeline) => (
            <option key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={filters.status}
        onChange={(event) => go({ status: event.target.value as BoardStatusKey })}
        aria-label="Status"
        className={selectClass}
      >
        {BOARD_STATUSES.map((status) => (
          <option key={status.key} value={status.key}>
            {status.label}
          </option>
        ))}
      </select>

      {members && (
        <select
          value={filters.owner}
          onChange={(event) => go({ owner: event.target.value })}
          aria-label="Dono"
          className={selectClass}
        >
          <option value="todos">Toda a equipe</option>
          <option value="meus">Minhas negociações</option>
          <option value="sem-dono">Sem responsável</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={filters.sort}
        onChange={(event) => go({ sort: event.target.value as BoardSortKey })}
        aria-label="Ordem"
        className={selectClass}
      >
        {BOARD_SORTS.map((sort) => (
          <option key={sort.key} value={sort.key}>
            {sort.label}
          </option>
        ))}
      </select>

      <form onSubmit={search} className="flex min-w-40 flex-1 items-center gap-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Título, empresa ou contato"
          aria-label="Filtrar por texto"
          className="h-8 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </form>

      <div className="ml-auto flex rounded-lg border border-foreground/10 p-0.5" role="group" aria-label="Visão">
        {(
          [
            ["quadro", "Quadro", KanbanSquare],
            ["lista", "Lista", LayoutList],
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
