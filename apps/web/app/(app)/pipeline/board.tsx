"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS, type OpportunityStatus } from "@/lib/opportunities/rules"
import { cn } from "@/lib/utils"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})

export interface BoardCard {
  id: string
  title: string
  value: number
  stageId: string
  status: OpportunityStatus
  companyName: string | null
  ownerName: string | null
  daysInStage: number
}

export interface BoardColumn {
  id: string
  name: string
  /** Falso em "Etapas removidas": nao recebe negociacoes. */
  droppable: boolean
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const letters = parts.length > 1 ? parts[0][0] + parts.at(-1)![0] : parts[0].slice(0, 2)
  return letters.toUpperCase()
}

export function Board({
  cards,
  columns,
  stages,
}: {
  cards: BoardCard[]
  columns: BoardColumn[]
  /** Etapas ativas do funil, para o seletor do celular. */
  stages: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState<string | null>(null)
  // Move na hora; a mudanca vale enquanto o servidor ainda devolver a etapa antiga.
  const [moves, setMoves] = useState<Record<string, { from: string; to: string }>>({})

  const stageOf = (card: BoardCard) =>
    moves[card.id]?.from === card.stageId ? moves[card.id].to : card.stageId

  async function move(card: BoardCard, stageId: string) {
    if (card.status !== "OPEN" || stageId === stageOf(card)) return
    setError("")
    const from = card.stageId
    setMoves((current) => ({ ...current, [card.id]: { from, to: stageId } }))

    const response = await fetch(`/api/opportunities/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    }).catch(() => null)

    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as { error?: string } | null
      setError(payload?.error ?? "Nao foi possivel mover a negociacao.")
      setMoves((current) => {
        const rest = { ...current }
        delete rest[card.id]
        return rest
      })
      return
    }

    router.refresh()
  }

  return (
    <div className="space-y-2">
      {error && (
        <div role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((column) => {
          const items = cards.filter((card) => stageOf(card) === column.id)
          const total = items.reduce((sum, item) => sum + item.value, 0)

          return (
            <section
              key={column.id}
              aria-label={column.name}
              onDragOver={(event) => {
                if (!column.droppable) return
                event.preventDefault()
                setDragOver(column.id)
              }}
              onDragLeave={() => setDragOver((current) => (current === column.id ? null : current))}
              onDrop={(event) => {
                event.preventDefault()
                setDragOver(null)
                const card = cards.find((item) => item.id === event.dataTransfer.getData("text/plain"))
                if (card && column.droppable) move(card, column.id)
              }}
              className={cn(
                "w-72 shrink-0 rounded-xl border bg-card transition-colors",
                dragOver === column.id ? "border-[#D4A64F]/60" : "border-foreground/5"
              )}
            >
              <div className="border-b border-foreground/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{column.name}</span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <span className="text-xs text-muted-foreground">{currencyFormatter.format(total)}</span>
              </div>

              <div className="min-h-24 space-y-2 p-2">
                {items.length === 0 ? (
                  <p className="p-2 text-center text-xs text-muted-foreground">Nenhuma negociação</p>
                ) : (
                  items.map((card) => (
                    <article
                      key={card.id}
                      data-opportunity={card.id}
                      draggable={card.status === "OPEN"}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", card.id)
                        event.dataTransfer.effectAllowed = "move"
                      }}
                      onDragEnd={() => setDragOver(null)}
                      className={cn(
                        "space-y-1.5 rounded-lg border border-foreground/5 bg-foreground/[0.02] p-3",
                        card.status === "OPEN" && "md:cursor-grab md:active:cursor-grabbing"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/pipeline/${card.id}`}
                          draggable={false}
                          className="min-w-0 text-sm font-medium text-foreground hover:text-gold-fg"
                        >
                          {card.title}
                        </Link>
                        {card.status !== "OPEN" && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0",
                              card.status === "WON"
                                ? "border-emerald-400/30 text-emerald-700 dark:text-emerald-300"
                                : "border-red-400/20 text-red-700 dark:text-red-300"
                            )}
                          >
                            {STATUS_LABELS[card.status]}
                          </Badge>
                        )}
                      </div>
                      {card.companyName && (
                        <p className="truncate text-xs text-muted-foreground">{card.companyName}</p>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          title={card.ownerName ?? "Sem responsável"}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4A64F]/15 text-[10px] font-semibold text-gold-fg"
                        >
                          {card.ownerName ? initials(card.ownerName) : "—"}
                        </span>
                        <span className="text-sm font-semibold text-gold-fg">
                          {currencyFormatter.format(card.value)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {card.daysInStage === 1 ? "1 dia na etapa" : `${card.daysInStage} dias na etapa`}
                      </p>

                      {card.status === "OPEN" && (
                        // Arrastar nao funciona em tela de toque: no celular, seletor.
                        <select
                          value={stageOf(card)}
                          onChange={(event) => move(card, event.target.value)}
                          aria-label={`Etapa de ${card.title}`}
                          className="h-8 w-full rounded-lg border border-foreground/10 bg-card px-2 text-xs text-foreground md:hidden"
                        >
                          {stages.map((stage) => (
                            <option key={stage.id} value={stage.id}>
                              {stage.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
