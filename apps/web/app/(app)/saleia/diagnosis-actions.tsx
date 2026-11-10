"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

type Action = "confirm" | "contest" | "reopen"

/**
 * "So diagnostico" (V2-8.2): a pessoa confirma o motivo sugerido pela IA (ou o
 * reescreve), contesta (a oferta foi apresentada) ou desfaz a decisao.
 */
export function DiagnosisActions({
  meetingId,
  status,
  suggestedReason,
  reason,
}: {
  meetingId: string
  status: "PENDING" | "CONFIRMED" | "CONTESTED"
  suggestedReason: string | null
  reason: string | null
}) {
  const router = useRouter()
  const [text, setText] = useState(suggestedReason ?? "")
  const [pending, setPending] = useState<Action | null>(null)
  const [error, setError] = useState("")

  async function decide(action: Action) {
    setError("")
    if (action === "confirm" && !text.trim()) {
      setError("Escreva o motivo antes de confirmar.")
      return
    }
    setPending(action)
    const response = await fetch(`/api/saleia/meetings/${meetingId}/diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "confirm" ? { action, reason: text } : { action }),
    }).catch(() => null)
    setPending(null)

    if (!response?.ok) {
      const body = await response?.json().catch(() => null)
      setError(body?.error ?? "Nao foi possivel registrar a decisao.")
      return
    }
    router.refresh()
  }

  const errorLine = error && (
    <p role="alert" className="text-xs text-red-700 dark:text-red-300">
      {error}
    </p>
  )

  if (status !== "PENDING") {
    return (
      <div className="space-y-2">
        {status === "CONFIRMED" ? (
          <p className="whitespace-pre-wrap text-sm text-foreground">
            <span className="text-muted-foreground">Motivo confirmado: </span>
            {reason}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Contestada: a oferta foi apresentada. Não conta como só diagnóstico.</p>
        )}
        <Button type="button" size="xs" variant="ghost" onClick={() => decide("reopen")} disabled={pending !== null}>
          {pending === "reopen" ? "Desfazendo..." : "Desfazer"}
        </Button>
        {errorLine}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {suggestedReason && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Sugestão da IA:</span> {suggestedReason}
        </p>
      )}
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={2000}
        rows={3}
        aria-label="Motivo de a oferta não ter sido apresentada"
        placeholder="Por que a oferta não foi apresentada?"
        className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-[#D4A64F]/60"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => decide("confirm")} disabled={pending !== null}>
          {pending === "confirm" ? "Confirmando..." : "Confirmar o motivo"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => decide("contest")} disabled={pending !== null}>
          {pending === "contest" ? "Registrando..." : "Não foi só diagnóstico"}
        </Button>
      </div>
      {errorLine}
    </div>
  )
}
