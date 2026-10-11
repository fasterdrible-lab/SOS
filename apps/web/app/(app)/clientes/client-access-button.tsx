"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ClientAccessButton({ organizationId }: { organizationId: string }) {
  const router = useRouter()
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState("")

  async function handleAccess() {
    setError("")
    setIsSwitching(true)

    const response = await fetch("/api/session/organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setError(payload?.error ?? "Nao foi possivel acessar essa organizacao.")
      setIsSwitching(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={handleAccess}
        disabled={isSwitching}
        className="border-white/10 text-white hover:bg-white/5"
      >
        {isSwitching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {isSwitching ? "Acessando..." : "Acessar"}
      </Button>
      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  )
}
