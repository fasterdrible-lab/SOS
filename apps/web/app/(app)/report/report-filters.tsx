"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Users } from "lucide-react"

import { cn } from "@/lib/utils"

type Tab = "dia" | "fechados"

function href(next: { tab: Tab; day?: string | null; sellerId?: string | null }) {
  const params = new URLSearchParams()
  if (next.tab === "fechados") params.set("aba", "fechados")
  if (next.tab === "dia" && next.day) params.set("dia", next.day)
  if (next.sellerId) params.set("vendedor", next.sellerId)
  const query = params.toString()
  return query ? `/report?${query}` : "/report"
}

/** Abas, navegacao entre dias e, para gestor e administrador, a pessoa. */
export function ReportFilters({
  tab,
  day,
  today,
  previous,
  next,
  sellerId,
  members,
}: {
  tab: Tab
  day: string
  today: string
  previous: string
  next: string | null
  sellerId: string | null
  /** Nulo para quem so ve o proprio dia. */
  members: { userId: string; name: string }[] | null
}) {
  const router = useRouter()

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-foreground/5 bg-card px-3 py-2.5">
      <span className="px-1 text-sm font-semibold text-foreground">Report</span>
      <nav className="flex gap-1" aria-label="Abas do report">
        {(
          [
            ["dia", "Meu dia"],
            ["fechados", "Dias fechados"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={href({ tab: key, day: key === "dia" ? day : null, sellerId })}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              tab === key
                ? "bg-[#D4A64F]/15 font-medium text-gold-fg"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {members && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden />
            <select
              value={sellerId ?? ""}
              onChange={(event) => router.push(href({ tab, day, sellerId: event.target.value || null }))}
              aria-label="Pessoa"
              className="h-8 max-w-48 rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"
            >
              <option value="">{tab === "fechados" ? "Toda a equipe" : "Eu"}</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {tab === "dia" && (
          <div className="flex items-center gap-1">
            <Link
              href={href({ tab, day: previous, sellerId })}
              aria-label="Dia anterior"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-foreground/10 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <input
              type="date"
              value={day}
              max={today}
              onChange={(event) => event.target.value && router.push(href({ tab, day: event.target.value, sellerId }))}
              aria-label="Dia"
              className="h-8 rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"
            />
            {next ? (
              <Link
                href={href({ tab, day: next, sellerId })}
                aria-label="Dia seguinte"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-foreground/10 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-foreground/5 text-muted-foreground/40" aria-hidden>
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
