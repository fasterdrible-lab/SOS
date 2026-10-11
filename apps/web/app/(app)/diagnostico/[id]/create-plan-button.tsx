"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpRight, ClipboardList, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { diagnosticActionPlanId } from "@/lib/diagnostico/action-plan-id"

export function CreatePlanButton({
  diagnosticId,
  hasActionPlan,
}: {
  diagnosticId: string
  hasActionPlan: boolean
}) {
  const router = useRouter()
  const [created, setCreated] = useState(hasActionPlan)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  if (created) {
    return (
      <Link
        href={`/planos/${diagnosticActionPlanId(diagnosticId)}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#D4A64F] hover:text-[#E0B85A]"
      >
        Ver plano de acao
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    )
  }

  async function handleClick() {
    setError("")
    setIsSubmitting(true)

    const response = await fetch(`/api/diagnosticos/${diagnosticId}/plano`, {
      method: "POST",
    })

    setIsSubmitting(false)

    if (!response.ok) {
      setError("Nao foi possivel gerar o plano de acao.")
      return
    }

    setCreated(true)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ClipboardList className="h-4 w-4" />
        )}
        {isSubmitting ? "Gerando..." : "Gerar plano de acao"}
      </Button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  )
}
