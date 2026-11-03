"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STATUS_LABELS, type OpportunityStatus } from "@/lib/opportunities/rules"
import { cn } from "@/lib/utils"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})

export interface OpportunityCardData {
  id: string
  title: string
  value: number
  stageId: string
  status: OpportunityStatus
  companyName: string | null
  contactName: string | null
  lostReason: string | null
}

export function OpportunityCard({
  opportunity,
  stages,
  canReopen,
}: {
  opportunity: OpportunityCardData
  /** Etapas ativas do funil da negociacao. */
  stages: { id: string; name: string }[]
  canReopen: boolean
}) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState("")
  const [isConfirmingLoss, setIsConfirmingLoss] = useState(false)
  const [lostReason, setLostReason] = useState("")
  const isOpen = opportunity.status === "OPEN"

  async function update(change: { stageId?: string; status?: OpportunityStatus; lostReason?: string }) {
    setError("")
    setIsUpdating(true)

    const response = await fetch(`/api/opportunities/${opportunity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    })

    setIsUpdating(false)

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      setError(payload?.error ?? "Nao foi possivel atualizar a negociacao.")
      return
    }

    setIsConfirmingLoss(false)
    setLostReason("")
    router.refresh()
  }

  return (
    <Card className="border-foreground/5 bg-foreground/[0.02]">
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{opportunity.title}</p>
          {!isOpen && (
            <Badge
              variant="outline"
              className={cn(
                "shrink-0",
                opportunity.status === "WON"
                  ? "border-emerald-400/30 text-emerald-700 dark:text-emerald-300"
                  : "border-red-400/20 text-red-700 dark:text-red-300"
              )}
            >
              {STATUS_LABELS[opportunity.status]}
            </Badge>
          )}
        </div>
        <p className="text-sm font-semibold text-gold-fg">
          {currencyFormatter.format(opportunity.value)}
        </p>
        {opportunity.companyName && (
          <p className="text-xs text-muted-foreground">{opportunity.companyName}</p>
        )}
        {opportunity.contactName && (
          <p className="text-xs text-muted-foreground">{opportunity.contactName}</p>
        )}

        <Select
          value={opportunity.stageId}
          onValueChange={(value) => {
            if (value && value !== opportunity.stageId) update({ stageId: value as string })
          }}
          disabled={isUpdating || !isOpen}
        >
          <SelectTrigger className="w-full" size="sm" aria-label="Etapa">
            {isUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SelectValue>
                {(value: string) => stages.find((stage) => stage.id === value)?.name ?? "Etapa removida"}
              </SelectValue>
            )}
          </SelectTrigger>
          <SelectContent>
            {stages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {opportunity.status === "LOST" && opportunity.lostReason && (
          <p className="text-xs text-muted-foreground">Motivo: {opportunity.lostReason}</p>
        )}

        {isOpen && !isConfirmingLoss && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isUpdating}
              onClick={() => update({ status: "WON" })}
              className="flex-1"
            >
              Ganhar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isUpdating}
              onClick={() => {
                setError("")
                setIsConfirmingLoss(true)
              }}
              className="flex-1"
            >
              Perder
            </Button>
          </div>
        )}

        {!isOpen && canReopen && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isUpdating}
            onClick={() =>
              // Ficou numa etapa removida: reabre na primeira etapa ativa.
              update({
                status: "OPEN",
                stageId: stages.some((stage) => stage.id === opportunity.stageId)
                  ? undefined
                  : stages[0]?.id,
              })
            }
            className="w-full"
          >
            Reabrir
          </Button>
        )}

        {isConfirmingLoss && (
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault()
              update({ status: "LOST", lostReason })
            }}
          >
            <Input
              autoFocus
              value={lostReason}
              onChange={(event) => setLostReason(event.target.value)}
              placeholder="Motivo da perda"
              aria-label="Motivo da perda"
              maxLength={500}
              className="h-8 text-xs"
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isUpdating || lostReason.trim().length < 3}>
                Confirmar perda
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsConfirmingLoss(false)
                  setLostReason("")
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {error && <p className="text-xs text-red-700 dark:text-red-300">{error}</p>}
      </CardContent>
    </Card>
  )
}
