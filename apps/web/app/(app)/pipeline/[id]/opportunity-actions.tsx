"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { OpportunityStatus } from "@/lib/opportunities/rules"
import type { PipelineSummary } from "@/lib/pipelines/service"

export function OpportunityActions({
  id,
  status,
  stageId,
  pipelines,
  canReopen,
}: {
  id: string
  status: OpportunityStatus
  stageId: string
  pipelines: Pick<PipelineSummary, "id" | "name" | "stages">[]
  canReopen: boolean
}) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState("")
  const [isConfirmingLoss, setIsConfirmingLoss] = useState(false)
  const [lostReason, setLostReason] = useState("")
  const isOpen = status === "OPEN"
  const stageActive = pipelines.some((pipeline) => pipeline.stages.some((stage) => stage.id === stageId))
  const [reopenStage, setReopenStage] = useState(stageActive ? stageId : (pipelines[0]?.stages[0]?.id ?? ""))

  async function update(change: { stageId?: string; status?: OpportunityStatus; lostReason?: string }) {
    setError("")
    setIsUpdating(true)

    const response = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    }).catch(() => null)

    setIsUpdating(false)

    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as { error?: string } | null
      setError(payload?.error ?? "Nao foi possivel atualizar a negociacao.")
      return
    }

    setIsConfirmingLoss(false)
    setLostReason("")
    router.refresh()
  }

  const stageOptions = pipelines.map((pipeline) => (
    <optgroup key={pipeline.id} label={pipeline.name}>
      {pipeline.stages.map((stage) => (
        <option key={stage.id} value={stage.id}>
          {stage.name}
        </option>
      ))}
    </optgroup>
  ))
  const selectClass =
    "h-9 w-full rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"

  return (
    <div className="space-y-3">
      {isOpen && (
        <>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Etapa (mude para mover de funil)</span>
            <select
              value={stageId}
              disabled={isUpdating}
              onChange={(event) => update({ stageId: event.target.value })}
              className={selectClass}
            >
              {stageOptions}
            </select>
          </label>

          {!isConfirmingLoss && (
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={isUpdating}
                onClick={() => update({ status: "WON" })}
                className="flex-1 bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]"
              >
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                Ganhar
              </Button>
              <Button
                type="button"
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
        </>
      )}

      {!isOpen && canReopen && (
        <div className="space-y-2">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Reabrir em</span>
            <select
              value={reopenStage}
              onChange={(event) => setReopenStage(event.target.value)}
              className={selectClass}
            >
              {stageOptions}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={isUpdating || !reopenStage}
            onClick={() => update({ status: "OPEN", stageId: reopenStage })}
            className="w-full"
          >
            Reabrir
          </Button>
        </div>
      )}

      {!isOpen && !canReopen && (
        <p className="text-sm text-muted-foreground">
          Negociação encerrada. Só gestor ou administrador pode reabrir.
        </p>
      )}

      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    </div>
  )
}
