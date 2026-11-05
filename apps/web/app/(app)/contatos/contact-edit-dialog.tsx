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

export interface ContactEditValues {
  id: string
  name: string
  companyId: string | null
  role: string | null
  phone: string | null
  email: string | null
}

export function ContactEditDialog({
  contact,
  companies,
}: {
  contact: ContactEditValues
  companies: { id: string; name: string }[]
}) {
  const router = useRouter()
  const initial = {
    name: contact.name,
    companyId: contact.companyId ?? "",
    role: contact.role ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
  }
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initial)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const update = (field: keyof typeof initial, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSaving(true)

    const response = await fetch(`/api/contacts/${contact.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null)

    setIsSaving(false)

    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as { error?: string } | null
      setError(payload?.error ?? "Nao foi possivel salvar o contato.")
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
          setForm(initial)
          setError("")
        }
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Editar ${contact.name}`} />}>
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Editar contato</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name" className="text-xs text-muted-foreground">Nome</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-company" className="text-xs text-muted-foreground">Empresa</Label>
              <select
                id="contact-company"
                value={form.companyId}
                onChange={(event) => update("companyId", event.target.value)}
                className="h-9 w-full rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"
              >
                <option value="">Sem empresa vinculada</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-role" className="text-xs text-muted-foreground">Cargo</Label>
              <Input id="contact-role" value={form.role} onChange={(event) => update("role", event.target.value)} maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone" className="text-xs text-muted-foreground">Telefone</Label>
              <Input id="contact-phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} maxLength={30} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-email" className="text-xs text-muted-foreground">E-mail</Label>
              <Input id="contact-email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} maxLength={160} />
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
