"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

type Action = "accept" | "dismiss" | "reopen"

/**
 * Botoes de decisao de uma recomendacao ou etapa sugerida do SALEIA. Aceitar
 * cria a atividade ou move a negociacao; descartado pode ser desfeito.
 */
export function InsightActions({
  id,
  kind,
  status,
  stageName,
  blockedReason,
}: {
  id: string
  kind: "RECOMMENDATION" | "STAGE_SUGGESTION"
  status: "OPEN" | "ACCEPTED" | "DISMISSED"
  stageName?: string | null
  /** Quando preenchido, aceitar fica desabilitado com este motivo. */
  blockedReason?: string | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState<Action | null>(null)
  const [error, setError] = useState("")

  if (status === "ACCEPTED") return null

  async function decide(action: Action) {
    setError("")
    setPending(action)
    const response = await fetch(`/api/saleia/insights/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null)
    setPending(null)

    if (!response?.ok) {
      const body = await response?.json().catch(() => null)
      setError(body?.error ?? "Nao foi possivel registrar a decisao.")
      return
    }
    router.refresh()
  }

  const acceptLabel = kind === "RECOMMENDATION" ? "Criar atividade" : stageName ? `Mover para ${stageName}` : "Aplicar etapa"

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        {status === "OPEN" ? (
          <>
            <Button
              type="button"
              size="xs"
              onClick={() => decide("accept")}
              disabled={pending !== null || Boolean(blockedReason)}
              title={blockedReason ?? undefined}
            >
              {pending === "accept" ? "Aplicando..." : acceptLabel}
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={() => decide("dismiss")} disabled={pending !== null}>
              {pending === "dismiss" ? "Descartando..." : "Descartar"}
            </Button>
          </>
        ) : (
          <Button type="button" size="xs" variant="ghost" onClick={() => decide("reopen")} disabled={pending !== null}>
            {pending === "reopen" ? "Desfazendo..." : "Desfazer descarte"}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
