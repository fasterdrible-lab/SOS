"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Settings {
  coolingAfterDays: number
  holidays: string[]
}

const longDate = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const formatDay = (day: string) => longDate.format(new Date(`${day}T00:00:00Z`))

/** Dias para "esfriando" e feriados (V2-9.3). Grava tudo de uma vez. */
export function CommercialForm({
  settings,
  limits,
}: {
  settings: Settings
  limits: { coolingMin: number; coolingMax: number; maxHolidays: number }
}) {
  const router = useRouter()
  const [cooling, setCooling] = useState(String(settings.coolingAfterDays))
  const [holidays, setHolidays] = useState(settings.holidays)
  const [newDay, setNewDay] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  const dirty = cooling !== String(settings.coolingAfterDays) || holidays.join(",") !== settings.holidays.join(",")

  function addHoliday() {
    setSaved(false)
    if (!newDay || holidays.includes(newDay)) return
    if (holidays.length >= limits.maxHolidays) {
      setError(`No máximo ${limits.maxHolidays} feriados.`)
      return
    }
    setError("")
    setHolidays([...holidays, newDay].sort())
    setNewDay("")
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setSaved(false)
    setBusy(true)
    const response = await fetch("/api/settings/commercial", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ coolingAfterDays: Number(cooling), holidays }),
    }).catch(() => null)
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null
    setBusy(false)
    if (!response?.ok) {
      setError(payload?.error ?? "Não foi possível salvar.")
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Card className="border-foreground/5 bg-card py-0">
        <CardContent className="space-y-3 p-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Negociações esfriando</h2>
            <p className="text-xs text-muted-foreground">
              Uma negociação em andamento esfria quando fica sem mudar de etapa por mais dias que este limite.
              Aparece no Meu Dia, na saúde do pipeline do Dashboard e no sino.
            </p>
          </div>
          <div className="max-w-40 space-y-1.5">
            <Label htmlFor="cooling-days">Dias sem mudar de etapa</Label>
            <Input
              id="cooling-days"
              type="number"
              inputMode="numeric"
              required
              min={limits.coolingMin}
              max={limits.coolingMax}
              step={1}
              value={cooling}
              onChange={(event) => {
                setSaved(false)
                setCooling(event.target.value)
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-foreground/5 bg-card py-0">
        <CardContent className="space-y-3 p-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Feriados ({holidays.length})</h2>
            <p className="text-xs text-muted-foreground">
              Dias sem expediente saem da conta de dias úteis: mudam o ideal até hoje, a projeção do mês e o
              quanto falta por dia para a meta. Sábados e domingos já não contam.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="holiday-day">Novo feriado</Label>
              <Input id="holiday-day" type="date" value={newDay} onChange={(event) => setNewDay(event.target.value)} />
            </div>
            <Button type="button" variant="outline" disabled={!newDay || busy} onClick={addHoliday}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
          {holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum feriado cadastrado.</p>
          ) : (
            <ul className="divide-y divide-foreground/5">
              {holidays.map((day) => (
                <li key={day} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="text-sm text-foreground">{formatDay(day)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${formatDay(day)}`}
                    disabled={busy}
                    onClick={() => {
                      setSaved(false)
                      setHolidays(holidays.filter((item) => item !== day))
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy || !dirty}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </Button>
        {saved && !dirty && (
          <span role="status" className="text-sm text-muted-foreground">
            Configurações salvas.
          </span>
        )}
      </div>
    </form>
  )
}
