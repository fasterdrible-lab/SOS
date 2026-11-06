"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, KeyRound, Loader2, Unplug } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })

/** Conexao com o SALE-IA: o segredo aparece uma unica vez, logo depois de gerado. */
export function SaleiaCard({
  connected,
  secretHint,
  lastEventAt,
  endpoint,
}: {
  connected: boolean
  secretHint: string | null
  lastEventAt: string | null
  endpoint: string
}) {
  const router = useRouter()
  const [secret, setSecret] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<"generate" | "remove" | null>(null)
  const [copied, setCopied] = useState("")

  const url = typeof window === "undefined" ? endpoint : `${window.location.origin}${endpoint}`

  async function call(method: "POST" | "DELETE") {
    if (method === "POST" && connected && !window.confirm("O segredo atual deixa de valer na hora. Gerar um novo?")) return
    if (method === "DELETE" && !window.confirm("Desconectar? O SALEIA deixa de enviar reuniões; as já recebidas continuam.")) return

    setError("")
    setBusy(method === "POST" ? "generate" : "remove")
    const response = await fetch("/api/settings/saleia", { method }).catch(() => null)
    const payload = (await response?.json().catch(() => null)) as { secret?: string; error?: string } | null
    setBusy(null)

    if (!response?.ok) {
      setError(payload?.error ?? "Nao foi possivel concluir.")
      return
    }
    setSecret(method === "POST" ? (payload?.secret ?? null) : null)
    router.refresh()
  }

  async function copy(label: string, value: string) {
    await navigator.clipboard?.writeText(value).catch(() => null)
    setCopied(label)
  }

  return (
    <Card className="border-foreground/5 bg-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base text-foreground">SALEIA</CardTitle>
          <Badge
            variant="outline"
            className={
              connected
                ? "border-emerald-400/30 bg-emerald-400/10 text-[10px] text-emerald-700 dark:text-emerald-400"
                : "border-foreground/10 text-[10px] text-muted-foreground"
            }
          >
            {connected ? "Conectado" : "Nao conectado"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Recebe as reuniões analisadas pelo SALEIA (resumo, recomendações, objeções, sinais e etapa sugerida) e liga
          cada uma à negociação, ao contato ou à empresa. Nada muda nas negociações sem uma pessoa.
        </p>

        {connected && (
          <div className="space-y-1 rounded-lg border border-foreground/5 bg-foreground/[0.02] p-3 text-xs text-muted-foreground">
            <p>Segredo terminado em <span className="font-mono text-foreground">{secretHint}</span></p>
            <p>{lastEventAt ? `Última reunião recebida em ${dateTime.format(new Date(lastEventAt))}` : "Nenhuma reunião recebida ainda."}</p>
          </div>
        )}

        {secret && (
          <div className="space-y-2 rounded-lg border border-[#D4A64F]/40 bg-[#D4A64F]/10 p-3 text-xs">
            <p className="font-medium text-foreground">
              Configure no SALE-IA agora. O segredo não aparece de novo.
            </p>
            {[
              ["Endereço", url],
              ["Segredo", secret],
            ].map(([label, value]) => (
              <div key={label} className="space-y-1">
                <p className="text-muted-foreground">{label}</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-1 font-mono text-foreground">{value}</code>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Copiar ${label}`} onClick={() => copy(label, value)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {copied && <p className="text-muted-foreground">{copied} copiado.</p>}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => call("POST")} disabled={busy !== null}>
            {busy === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {connected ? "Gerar novo segredo" : "Conectar"}
          </Button>
          {connected && (
            <Button
              type="button"
              variant="ghost"
              className="text-red-700 dark:text-red-300"
              onClick={() => call("DELETE")}
              disabled={busy !== null}
            >
              {busy === "remove" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
              Desconectar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
