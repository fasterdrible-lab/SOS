"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Target } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface GoalMember {
  userId: string
  name: string
  roleLabel: string
  goal: number | null
}

const ORGANIZATION_KEY = "__organizacao__"

function toInput(value: number | null) {
  return value === null ? "" : String(value)
}

export function GoalDialog({
  month,
  monthLabel,
  organizationGoal,
  members,
}: {
  month: string
  monthLabel: string
  organizationGoal: number | null
  members: GoalMember[]
}) {
  const router = useRouter()
  const initial = Object.fromEntries([
    [ORGANIZATION_KEY, toInput(organizationGoal)],
    ...members.map((member) => [member.userId, toInput(member.goal)]),
  ]) as Record<string, string>

  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(initial)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const changed = Object.keys(values).filter((key) => values[key].trim() !== initial[key])
    if (changed.length === 0) {
      setOpen(false)
      return
    }

    setIsSubmitting(true)

    for (const key of changed) {
      const raw = values[key].trim().replace(",", ".")
      const response = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          userId: key === ORGANIZATION_KEY ? null : key,
          amount: raw === "" ? null : Number(raw),
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const who =
          key === ORGANIZATION_KEY
            ? "da equipe"
            : `de ${members.find((member) => member.userId === key)?.name ?? "vendedor"}`
        setError(`${payload?.error ?? "Não foi possível salvar"} (meta ${who}).`)
        setIsSubmitting(false)
        router.refresh()
        return
      }
    }

    setIsSubmitting(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setValues(initial)
          setError("")
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="border-[#D4A64F]/40 text-gold-fg hover:bg-[#D4A64F]/10"
          />
        }
      >
        <Target className="h-3.5 w-3.5" />
        {organizationGoal === null ? "Definir metas" : "Editar metas"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Metas de {monthLabel}</DialogTitle>
            <DialogDescription>
              Faturamento em reais. Deixe em branco para remover a meta.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="meta-equipe" className="text-xs text-muted-foreground">
                Meta da equipe
              </Label>
              <Input
                id="meta-equipe"
                inputMode="decimal"
                value={values[ORGANIZATION_KEY]}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [ORGANIZATION_KEY]: event.target.value }))
                }
                placeholder="Ex: 300000"
              />
            </div>

            {members.length > 0 && (
              <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Metas individuais
              </p>
            )}

            {members.map((member) => (
              <div key={member.userId} className="grid grid-cols-[1fr_9rem] items-center gap-3">
                <Label htmlFor={`meta-${member.userId}`} className="flex flex-col items-start gap-0">
                  <span className="truncate text-sm text-foreground">{member.name}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {member.roleLabel}
                  </span>
                </Label>
                <Input
                  id={`meta-${member.userId}`}
                  inputMode="decimal"
                  value={values[member.userId]}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [member.userId]: event.target.value }))
                  }
                  placeholder="Sem meta"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}

          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar metas
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
