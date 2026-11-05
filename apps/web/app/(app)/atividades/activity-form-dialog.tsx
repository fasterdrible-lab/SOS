"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Plus } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  requiresDueDate,
  type ActivityType,
} from "@/lib/activities/rules"
import type { ActivityItem } from "@/lib/activities/service"

type Option = { id: string; name: string }

export interface ActivityFormOptions {
  opportunities: Option[]
  companies: Option[]
  contacts: Option[]
}

const selectClass =
  "h-9 w-full rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"

/** Valor de `datetime-local` no fuso do navegador. */
function toLocalInput(iso: string | null) {
  if (!iso) return ""
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function ActivityFormDialog({
  activity,
  context,
  options,
  members,
  userId,
}: {
  /** Presente: edita. */
  activity?: ActivityItem
  /** Vinculos fixos, na pagina da negociacao ou da empresa. */
  context?: { opportunityId?: string; companyId?: string }
  /** Nulo: nao mostra os seletores de vinculo. */
  options: ActivityFormOptions | null
  /** Nulo para quem nao pode atribuir a outra pessoa. */
  members: Option[] | null
  userId: string
}) {
  const router = useRouter()
  const blank = () => ({
    type: (activity?.type ?? "FOLLOW_UP") as ActivityType,
    title: activity?.title ?? "",
    description: activity?.description ?? "",
    dueDate: toLocalInput(activity?.dueDate ?? null),
    ownerId: activity ? (activity.owner?.id ?? "") : userId,
    opportunityId: activity?.opportunity?.id ?? "",
    companyId: activity?.company?.id ?? "",
    contactId: activity?.contact?.id ?? "",
  })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const update = (field: keyof ReturnType<typeof blank>, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  async function send(method: string, url: string, body?: unknown) {
    setError("")
    setIsSaving(true)
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => null)
    setIsSaving(false)

    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as { error?: string } | null
      setError(payload?.error ?? "Nao foi possivel salvar a atividade.")
      return false
    }

    setOpen(false)
    router.refresh()
    return true
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = {
      type: form.type,
      title: form.title,
      description: form.description,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      ...(members ? { ownerId: form.ownerId } : {}),
      ...(options
        ? { opportunityId: form.opportunityId, companyId: form.companyId, contactId: form.contactId }
        : {}),
      ...(activity ? {} : context),
    }
    send(activity ? "PATCH" : "POST", activity ? `/api/activities/${activity.id}` : "/api/activities", body)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setForm(blank())
          setError("")
        }
      }}
    >
      {activity ? (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Editar ${activity.title}`} />}>
          <Pencil className="h-3.5 w-3.5" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button size="sm" className="bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]" />}>
          <Plus className="h-4 w-4" />
          Nova atividade
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{activity ? "Editar atividade" : "Nova atividade"}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="activity-type" className="text-xs text-muted-foreground">Tipo</Label>
                <select
                  id="activity-type"
                  value={form.type}
                  onChange={(event) => update("type", event.target.value)}
                  className={selectClass}
                >
                  {ACTIVITY_TYPES.map((type) => (
                    <option key={type} value={type}>{ACTIVITY_TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="activity-due" className="text-xs text-muted-foreground">Data e hora</Label>
                <Input
                  id="activity-due"
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(event) => update("dueDate", event.target.value)}
                  required={requiresDueDate(form.type)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="activity-title" className="text-xs text-muted-foreground">Título</Label>
              <Input
                id="activity-title"
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Ex: Retornar sobre a proposta"
                maxLength={160}
                required
              />
            </div>

            {members && (
              <div className="space-y-1.5">
                <Label htmlFor="activity-owner" className="text-xs text-muted-foreground">Responsável</Label>
                <select
                  id="activity-owner"
                  value={form.ownerId}
                  onChange={(event) => update("ownerId", event.target.value)}
                  className={selectClass}
                >
                  <option value="">Sem responsável</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
            )}

            {options && (
              <>
                <LinkSelect id="activity-opportunity" label="Negociação" empty="Sem negociação" value={form.opportunityId} items={options.opportunities} onChange={(value) => update("opportunityId", value)} />
                <LinkSelect id="activity-company" label="Empresa" empty="Sem empresa" value={form.companyId} items={options.companies} onChange={(value) => update("companyId", value)} />
                <LinkSelect id="activity-contact" label="Contato" empty="Sem contato" value={form.contactId} items={options.contacts} onChange={(value) => update("contactId", value)} />
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="activity-description" className="text-xs text-muted-foreground">Descrição</Label>
              <Textarea
                id="activity-description"
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                maxLength={2000}
                rows={3}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <DialogFooter className="-mx-4 -mb-4">
            {activity && (
              <Button
                type="button"
                variant="ghost"
                disabled={isSaving}
                onClick={() => send("DELETE", `/api/activities/${activity.id}`)}
                className="sm:mr-auto"
              >
                Remover
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LinkSelect({
  id,
  label,
  empty,
  value,
  items,
  onChange,
}: {
  id: string
  label: string
  empty: string
  value: string
  items: Option[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
        <option value="">{empty}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
    </div>
  )
}
