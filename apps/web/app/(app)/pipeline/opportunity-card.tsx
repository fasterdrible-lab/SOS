"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OPPORTUNITY_STAGES } from "@/lib/validations/opportunity"

const STAGE_LABELS: Record<(typeof OPPORTUNITY_STAGES)[number], string> = {
  PROSPECTING: "Prospeccao",
  QUALIFICATION: "Qualificacao",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociacao",
  CLOSED_WON: "Fechado (Ganho)",
  CLOSED_LOST: "Fechado (Perdido)",
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})

export interface OpportunityCardData {
  id: string
  title: string
  value: number
  stage: (typeof OPPORTUNITY_STAGES)[number]
  companyName: string | null
  contactName: string | null
}

export function OpportunityCard({
  opportunity,
}: {
  opportunity: OpportunityCardData
}) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState("")

  async function handleStageChange(nextStage: string) {
    setError("")
    setIsUpdating(true)

    const response = await fetch(`/api/opportunities/${opportunity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: nextStage }),
    })

    setIsUpdating(false)

    if (!response.ok) {
      setError("Nao foi possivel mover a oportunidade.")
      return
    }

    router.refresh()
  }

  return (
    <Card className="border-white/5 bg-white/[0.02]">
      <CardContent className="space-y-2 p-3">
        <p className="text-sm font-medium text-white">{opportunity.title}</p>
        <p className="text-sm font-semibold text-[#D4A64F]">
          {currencyFormatter.format(opportunity.value)}
        </p>
        {opportunity.companyName && (
          <p className="text-xs text-muted-foreground">
            {opportunity.companyName}
          </p>
        )}
        {opportunity.contactName && (
          <p className="text-xs text-muted-foreground">
            {opportunity.contactName}
          </p>
        )}

        <Select
          value={opportunity.stage}
          onValueChange={(value) => handleStageChange(value as string)}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-full" size="sm">
            {isUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent>
            {OPPORTUNITY_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {error && <p className="text-xs text-red-300">{error}</p>}
      </CardContent>
    </Card>
  )
}
