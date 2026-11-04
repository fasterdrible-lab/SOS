"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil } from "lucide-react"

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

type Option = { id: string; name: string }

export interface OpportunityEditValues {
  title: string
  value: number
  companyId: string
  contactId: string
  ownerId: string
  /** AAAA-MM-DD ou vazio. */
  expectedClose: string
  notes: string
}

const selectClass =
  "h-9 w-full rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"

export function OpportunityEditDialog({
  id,
  values,
  companies,
  contacts,
  owners,
}: {
  id: string
  values: OpportunityEditValues
  companies: Option[]
  contacts: Option[]
  /** Nulo para quem nao pode trocar o dono. */
  owners: Option[] | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ ...values, value: String(values.value) })
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSaving(true)

    const response = await fetch(`/api/opportunities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      // Sem permissao, o dono nao vai no corpo.
      body: JSON.stringify(owners ? form : { ...form, ownerId: undefined }),
    }).catch(() => null)

    setIsSaving(false)

    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as { error?: string } | null
      setError(payload?.error ?? "Nao foi possivel salvar a negociacao.")
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setForm({ ...values, value: String(values.value) })
          setError("")
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Editar negociação</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title" className="text-xs text-muted-foreground">Título</Label>
              <Input
                id="edit-title"
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                maxLength={160}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-value" className="text-xs text-muted-foreground">Valor</Label>
              <Input
                id="edit-value"
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(event) => update("value", event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-company" className="text-xs text-muted-foreground">Empresa</Label>
              <select
                id="edit-company"
                value={form.companyId}
                onChange={(event) => update("companyId", event.target.value)}
                className={selectClass}
              >
                <option value="">Sem empresa vinculada</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-contact" className="text-xs text-muted-foreground">Contato</Label>
              <select
                id="edit-contact"
                value={form.contactId}
                onChange={(event) => update("contactId", event.target.value)}
                className={selectClass}
              >
                <option value="">Sem contato vinculado</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>{contact.name}</option>
                ))}
              </select>
            </div>
            {owners && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-owner" className="text-xs text-muted-foreground">Dono</Label>
                <select
                  id="edit-owner"
                  value={form.ownerId}
                  onChange={(event) => update("ownerId", event.target.value)}
                  className={selectClass}
                >
                  <option value="">Sem responsável</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>{owner.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="edit-close" className="text-xs text-muted-foreground">Previsão de fechamento</Label>
              <Input
                id="edit-close"
                type="date"
                value={form.expectedClose}
                onChange={(event) => update("expectedClose", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes" className="text-xs text-muted-foreground">Observações</Label>
              <Textarea
                id="edit-notes"
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
