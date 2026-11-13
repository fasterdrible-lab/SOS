"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface TeamOption {
  id: string
  name: string
  memberCount: number
}

/** Equipes (V2-9.2): o gestor com equipe ve a equipe dele e o que esta sem dono. */
export function TeamPanel({ teams }: { teams: TeamOption[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function send(key: string, url: string, init: RequestInit) {
    setError("")
    setBusy(key)
    const response = await fetch(url, init).catch(() => null)
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null
    setBusy(null)
    if (!response?.ok) {
      setError(payload?.error ?? "Nao foi possivel concluir.")
      return false
    }
    router.refresh()
    return true
  }

  const json = (method: string, body: unknown): RequestInit => ({
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

  async function create(event: React.FormEvent) {
    event.preventDefault()
    if (await send("create", "/api/settings/teams", json("POST", { name }))) setName("")
  }

  function rename(team: TeamOption) {
    const next = window.prompt("Novo nome da equipe", team.name)?.trim()
    if (!next || next === team.name) return
    void send(team.id, `/api/settings/teams/${team.id}`, json("PATCH", { name: next }))
  }

  function remove(team: TeamOption) {
    const people =
      team.memberCount === 0
        ? "Ela não tem pessoas."
        : `${team.memberCount} pessoa(s) ficam sem equipe; um gestor sem equipe volta a ver todas as negociações.`
    if (!window.confirm(`Remover a equipe ${team.name}? ${people}`)) return
    void send(team.id, `/api/settings/teams/${team.id}`, { method: "DELETE" })
  }

  return (
    <Card className="border-foreground/5 bg-card py-0">
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Equipes ({teams.length})</h2>
          <p className="text-xs text-muted-foreground">
            Um gestor que está numa equipe vê as negociações e atividades da equipe dele e as que estão sem
            responsável. Gestor sem equipe e administrador veem tudo. Cada pessoa fica em no máximo uma equipe,
            escolhida na lista de pessoas abaixo.
          </p>
        </div>

        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-1.5">
            <Label htmlFor="team-name">Nova equipe</Label>
            <Input
              id="team-name"
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Inside Sales"
            />
          </div>
          <Button type="submit" variant="outline" disabled={busy !== null}>
            {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar equipe
          </Button>
        </form>

        {error && (
          <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        {teams.length > 0 && (
          <ul className="divide-y divide-foreground/5">
            {teams.map((team) => (
              <li key={team.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{team.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {team.memberCount === 1 ? "1 pessoa" : `${team.memberCount} pessoas`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {busy === team.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Renomear ${team.name}`}
                    disabled={busy !== null}
                    onClick={() => rename(team)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${team.name}`}
                    className="text-red-700 dark:text-red-300"
                    disabled={busy !== null}
                    onClick={() => remove(team)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
