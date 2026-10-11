"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ACTION_TASK_PRIORITIES } from "@/lib/validations/action-task"

const PRIORITY_LABELS: Record<(typeof ACTION_TASK_PRIORITIES)[number], string> = {
  LOW: "Baixa",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
}

const initialForm = {
  title: "",
  description: "",
  responsible: "",
  dueDate: "",
  priority: "MEDIUM" as (typeof ACTION_TASK_PRIORITIES)[number],
}

export function TaskFormDialog({ actionPlanId }: { actionPlanId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField<Field extends keyof typeof initialForm>(
    field: Field,
    value: (typeof initialForm)[Field]
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetAndClose() {
    setForm(initialForm)
    setError("")
    setOpen(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    const response = await fetch(`/api/action-plans/${actionPlanId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const payload = await response.json().catch(() => null)
    setIsSubmitting(false)

    if (!response.ok) {
      setError(payload?.error ?? "Nao foi possivel salvar a tarefa.")
      return
    }

    resetAndClose()
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setForm(initialForm)
          setError("")
        }
      }}
    >
      <DialogTrigger
        render={
          <Button className="bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]" />
        }
      >
        <Plus className="h-4 w-4" />
        Nova tarefa
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Titulo</Label>
              <Input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Ex: Documentar playbook de vendas"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Descricao
              </Label>
              <Textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Detalhes da tarefa (opcional)."
                className="min-h-20"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Responsavel
                </Label>
                <Input
                  value={form.responsible}
                  onChange={(event) =>
                    updateField("responsible", event.target.value)
                  }
                  placeholder="Ex: Maria Souza"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Prazo</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    updateField("dueDate", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Prioridade
              </Label>
              <Select
                value={form.priority}
                onValueChange={(value) =>
                  updateField(
                    "priority",
                    value as (typeof ACTION_TASK_PRIORITIES)[number]
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: (typeof ACTION_TASK_PRIORITIES)[number]) =>
                      PRIORITY_LABELS[value]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TASK_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Salvando..." : "Salvar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
