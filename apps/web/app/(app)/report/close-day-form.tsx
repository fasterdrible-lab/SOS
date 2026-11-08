"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

/** Observacao e botao "Fechar o dia". Fechado, o dia nao muda. */
export function CloseDayForm({ day, pendingCount }: { day: string; pendingCount: number }) {
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function close() {
    setError("")
    setSaving(true)
    const response = await fetch("/api/reports/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, notes }),
    }).catch(() => null)
    setSaving(false)

    if (!response?.ok) {
      const body = await response?.json().catch(() => null)
      setError(body?.error ?? "Nao foi possivel fechar o dia.")
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm text-muted-foreground">Observações do dia (opcional)</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="O que travou, o que avançou, o que fica para amanhã."
          className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"
        />
      </label>
      {pendingCount > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {pendingCount === 1
            ? "1 atividade do dia ainda está pendente e ficará registrada assim."
            : `${pendingCount} atividades do dia ainda estão pendentes e ficarão registradas assim.`}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={close} disabled={saving}>
          {saving ? "Fechando..." : "Fechar o dia"}
        </Button>
        <span className="text-xs text-muted-foreground">Os números de agora ficam registrados e não mudam depois.</span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
