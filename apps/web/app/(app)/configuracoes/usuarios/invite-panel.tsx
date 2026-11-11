"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, Loader2, Send, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ASSIGNABLE_ROLES, type AssignableRole, roleLabel } from "@/lib/members/rules"

const selectClass =
  "h-9 w-full rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })

interface Invite {
  id: string
  email: string
  role: string
  expiresAt: string
  state: string
  invitedBy: string | null
}

/** Convite por link: o link aparece uma unica vez, logo depois de criado. */
export function InvitePanel({ invites, ttlDays }: { invites: Invite[]; ttlDays: number }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<AssignableRole>("MEMBER")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [created, setCreated] = useState<{ email: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setCopied(false)
    setBusy("create")
    const response = await fetch("/api/settings/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role }),
    }).catch(() => null)
    const payload = (await response?.json().catch(() => null)) as { path?: string; error?: string } | null
    setBusy(null)
    if (!response?.ok || !payload?.path) {
      setError(payload?.error ?? "Nao foi possivel criar o convite.")
      return
    }
    setCreated({ email, url: `${window.location.origin}${payload.path}` })
    setEmail("")
    router.refresh()
  }

  async function revoke(invite: Invite) {
    if (!window.confirm(`Cancelar o convite de ${invite.email}? O link deixa de valer.`)) return
    setError("")
    setBusy(invite.id)
    const response = await fetch(`/api/settings/invites/${invite.id}`, { method: "DELETE" }).catch(() => null)
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null
    setBusy(null)
    if (!response?.ok) {
      setError(payload?.error ?? "Nao foi possivel cancelar o convite.")
      return
    }
    router.refresh()
  }

  async function copy(value: string) {
    await navigator.clipboard?.writeText(value).catch(() => null)
    setCopied(true)
  }

  return (
    <Card className="border-foreground/5 bg-card py-0">
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Convidar pessoa</h2>
          <p className="text-xs text-muted-foreground">
            Gera um link de uso único, válido por {ttlDays} dias. Envie por WhatsApp ou e-mail; a pessoa define a
            própria senha. Quem já tem conta entra com a senha atual.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              required
              maxLength={200}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="pessoa@empresa.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Papel</Label>
            <select
              id="invite-role"
              value={role}
              onChange={(event) => setRole(event.target.value as AssignableRole)}
              className={selectClass}
            >
              {ASSIGNABLE_ROLES.map((option) => (
                <option key={option} value={option}>
                  {roleLabel(option)}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            disabled={busy !== null}
            className="bg-[#D4A64F] font-semibold text-[#1E1B3A] hover:bg-[#E0B85A]"
          >
            {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Gerar link
          </Button>
        </form>

        {created && (
          <div className="space-y-2 rounded-lg border border-[#D4A64F]/40 bg-[#D4A64F]/10 p-3 text-xs">
            <p className="font-medium text-foreground">
              Envie este link para {created.email} agora. Ele não aparece de novo.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-1 font-mono text-foreground">
                {created.url}
              </code>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Copiar link" onClick={() => copy(created.url)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            {copied && <p className="text-muted-foreground">Link copiado.</p>}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        {invites.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Convites em aberto</h3>
            <ul className="divide-y divide-foreground/5">
              {invites.map((invite) => (
                <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {roleLabel(invite.role)}
                      {invite.invitedBy ? ` · por ${invite.invitedBy}` : ""}
                      {invite.state === "EXPIRED" ? "" : ` · vale até ${dateTime.format(new Date(invite.expiresAt))}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {invite.state === "EXPIRED" && (
                      <Badge variant="outline" className="border-foreground/10 text-[10px] text-muted-foreground">
                        Expirado
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy !== null}
                      onClick={() => revoke(invite)}
                    >
                      {busy === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      {invite.state === "EXPIRED" ? "Remover" : "Cancelar"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
