"use client"

import { usePathname, useRouter } from "next/navigation"
import { CalendarDays, Users } from "lucide-react"

import type { DashboardMember } from "@/lib/dashboard/executive"
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/dashboard/period"
import { cn } from "@/lib/utils"

export function DashboardFilters({
  period,
  sellerId,
  members,
}: {
  period: PeriodKey
  sellerId: string | null
  /** Nulo para o vendedor, que so ve os proprios numeros. */
  members: DashboardMember[] | null
}) {
  const router = useRouter()
  const pathname = usePathname()

  function apply(next: { period?: PeriodKey; sellerId?: string | null }) {
    const params = new URLSearchParams()
    const nextPeriod = next.period ?? period
    const nextSeller = next.sellerId === undefined ? sellerId : next.sellerId
    if (nextPeriod !== "mes") params.set("periodo", nextPeriod)
    if (nextSeller) params.set("vendedor", nextSeller)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-foreground/5 bg-card px-3 py-2.5">
      <CalendarDays className="h-4 w-4 text-gold-fg" aria-hidden />
      <div className="flex flex-wrap gap-1" role="group" aria-label="Período">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => apply({ period: option.key })}
            aria-pressed={option.key === period}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              option.key === period
                ? "bg-[#D4A64F]/15 font-medium text-gold-fg"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {members && (
        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" aria-hidden />
          <span className="sr-only">Vendedor</span>
          <select
            value={sellerId ?? ""}
            onChange={(event) => apply({ sellerId: event.target.value || null })}
            aria-label="Vendedor"
            className="h-8 rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"
          >
            <option value="">Toda a equipe</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
