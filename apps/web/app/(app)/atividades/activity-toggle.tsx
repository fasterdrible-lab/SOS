"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

/** Conclui ou reabre a atividade. */
export function ActivityToggle({ id, title, done }: { id: string; title: string; done: boolean }) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState("")

  async function toggle() {
    setError("")
    setIsUpdating(true)
    const response = await fetch(`/api/activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !done }),
    }).catch(() => null)
    setIsUpdating(false)

    if (!response?.ok) {
      setError("Nao foi possivel atualizar.")
      return
    }
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isUpdating}
      aria-pressed={done}
      aria-label={done ? `Reabrir ${title}` : `Concluir ${title}`}
      title={error || (done ? "Reabrir" : "Concluir")}
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#D4A64F]",
        done
          ? "border-[#D4A64F] bg-[#D4A64F] text-[#1E1B3A]"
          : "border-foreground/25 text-transparent hover:border-[#D4A64F] hover:text-gold-fg",
        error && "border-red-400"
      )}
    >
      <Check className="h-3 w-3" />
    </button>
  )
}
