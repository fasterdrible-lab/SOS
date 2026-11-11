"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, KeyRound, Loader2, UserMinus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ASSIGNABLE_ROLES, roleLabel } from "@/lib/members/rules"

const selectClass =
  "h-8 rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F] disabled:opacity-60"

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })

interface Member {
  id: string
  userId: string
  name: string | null
  email: string
  role: string
  createdAt: string
  sharedAccount: boolean
}

export function MemberList({
  members,
  currentUserId,
  resetHours,
}: {
  members: Member[]
  currentUserId: string
  resetHours: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [resetLink, setResetLink] = useState<{ who: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function createResetLink(member: Member) {
    const who = member.name ?? member.email
    if (!window.confirm(`Gerar um link para ${who} criar uma nova senha? A senha atual continua valendo até o link ser usado.`)) return
    setError("")
    setCopied(false)
    setBusy(member.id)
    const response = await fetch(`/api/settings/members/${member.id}/password-reset`, { method: "POST" }).catch(() => null)
    const payload = (await response?.json().catch(() => null)) as { path?: string; error?: string } | null
    setBusy(null)
    if (!response?.ok || !payload?.path) {
      setError(payload?.error ?? "Nao foi possivel gerar o link.")
      return
    }
    setResetLink({ who, url: `${window.location.origin}${payload.path}` })
  }

  async function copy(value: string) {
    await navigator.clipboard?.writeText(value).catch(() => null)
    setCopied(true)
  }

  async function send(member: Member, init: RequestInit) {
    setError("")
    setBusy(member.id)
    const response = await fetch(`/api/settings/members/${member.id}`, init).catch(() => null)
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null
    setBusy(null)
    if (!response?.ok) {
      setError(payload?.error ?? "Nao foi possivel concluir.")
      return
    }
    router.refresh()
  }

  function changeRole(member: Member, role: string) {
    void send(member, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    })
  }

  function remove(member: Member) {
    const who = member.name ?? member.email
    if (!window.confirm(`Remover ${who} desta organização? A pessoa perde o acesso na hora; as negociações e atividades dela continuam.`)) return
    void send(member, { method: "DELETE" })
  }

  return (
    <Card className="border-foreground/5 bg-card py-0">
      <CardContent className="space-y-3 p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Pessoas ({members.length})</h2>
          <p className="text-xs text-muted-foreground">
            Esqueceu a senha? Use <KeyRound className="inline h-3 w-3" aria-hidden /> para gerar um link de nova senha,
            válido por {resetHours} horas, e envie para a pessoa.
          </p>
        </div>
        {resetLink && (
          <div className="space-y-2 rounded-lg border border-[#D4A64F]/40 bg-[#D4A64F]/10 p-3 text-xs">
            <p className="font-medium text-foreground">
              Envie este link para {resetLink.who} agora. Ele não aparece de novo e vale uma vez.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-1 font-mono text-foreground">
                {resetLink.url}
              </code>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Copiar link" onClick={() => copy(resetLink.url)}>
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
        <ul className="divide-y divide-foreground/5">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId
            // OWNER e CONSULTANT aparecem como estao; trocar leva a um dos tres papeis.
            const legacy = !(ASSIGNABLE_ROLES as readonly string[]).includes(member.role)
            return (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.name ?? member.email}
                    {isSelf && <span className="ml-2 text-xs font-normal text-muted-foreground">(você)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email} · desde {dateFormat.format(new Date(member.createdAt))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {busy === member.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <select
                    aria-label={`Papel de ${member.name ?? member.email}`}
                    value={member.role}
                    disabled={isSelf || busy !== null}
                    title={isSelf ? "Você não pode mudar o próprio papel." : undefined}
                    onChange={(event) => changeRole(member, event.target.value)}
                    className={selectClass}
                  >
                    {legacy && <option value={member.role}>{roleLabel(member.role)}</option>}
                    {ASSIGNABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Link de nova senha para ${member.name ?? member.email}`}
                    title={
                      member.sharedAccount
                        ? "Esta conta participa de outras organizações; a senha não é redefinida por aqui."
                        : "Gerar link de nova senha"
                    }
                    disabled={busy !== null || member.sharedAccount}
                    onClick={() => createResetLink(member)}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  {!isSelf && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover ${member.name ?? member.email}`}
                      className="text-red-700 dark:text-red-300"
                      disabled={busy !== null}
                      onClick={() => remove(member)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
