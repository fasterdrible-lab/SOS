"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Loader2, Target } from "lucide-react"

import { Button } from "@/components/ui/button"

export function CreateOpportunityButton({
  diagnosticId,
  hasOpportunity,
}: {
  diagnosticId: string
  hasOpportunity: boolean
}) {
  const router = useRouter()
  const [created, setCreated] = useState(hasOpportunity)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  if (created) {
    return (
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#D4A64F] hover:text-[#E0B85A]"
      >
        Ver oportunidade no pipeline
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    )
  }

  async function handleClick() {
    setError("")
    setIsSubmitting(true)

    const response = await fetch(
      `/api/diagnosticos/${diagnosticId}/oportunidade`,
      { method: "POST" }
    )

    setIsSubmitting(false)

    if (!response.ok) {
      setError("Nao foi possivel criar a oportunidade.")
      return
    }

    setCreated(true)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
        className="bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Target className="h-4 w-4" />
        )}
        {isSubmitting ? "Criando..." : "Criar oportunidade no CRM"}
      </Button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  )
}
