"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Key, Loader2, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { API_PROVIDERS } from "@/lib/validations/api-integration"

export function IntegrationCard({
  provider,
  label,
  description,
  maskedKey,
  updatedAt,
}: {
  provider: (typeof API_PROVIDERS)[number]
  label: string
  description: string
  maskedKey: string | null
  updatedAt: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    const response = await fetch("/api/settings/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey }),
    })

    const payload = await response.json().catch(() => null)
    setIsSubmitting(false)

    if (!response.ok) {
      setError(payload?.error ?? "Nao foi possivel salvar a chave.")
      return
    }

    setApiKey("")
    setOpen(false)
    router.refresh()
  }

  async function handleRemove() {
    setIsRemoving(true)

    const response = await fetch(`/api/settings/integrations/${provider}`, {
      method: "DELETE",
    })

    setIsRemoving(false)

    if (response.ok) {
      router.refresh()
    }
  }

  return (
    <Card className="border-white/5 bg-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base text-white">{label}</CardTitle>
          <Badge
            variant="outline"
            className={
              maskedKey
                ? "border-emerald-400/30 bg-emerald-400/10 text-[10px] text-emerald-400"
                : "border-white/10 text-[10px] text-muted-foreground"
            }
          >
            {maskedKey ? "Configurado" : "Nao configurado"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>

        {maskedKey ? (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <p className="font-mono text-sm text-white">{maskedKey}</p>
            {updatedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Atualizada em{" "}
                {new Intl.DateTimeFormat("pt-BR").format(new Date(updatedAt))}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma chave configurada.
          </p>
        )}

        <div className="flex items-center gap-2">
          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen)
              if (!nextOpen) {
                setApiKey("")
                setError("")
              }
            }}
          >
            <DialogTrigger render={<Button variant="outline" />}>
              <Key className="h-4 w-4" />
              {maskedKey ? "Atualizar chave" : "Configurar"}
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>{label}</DialogTitle>
                </DialogHeader>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Chave de API
                  </Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="sk-..."
                    autoComplete="off"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <DialogFooter className="-mx-4 -mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]"
                  >
                    {isSubmitting && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {isSubmitting ? "Salvando..." : "Salvar chave"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {maskedKey && (
            <Button
              type="button"
              variant="ghost"
              className="text-red-300 hover:text-red-200"
              onClick={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remover
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
