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

type Option = {
  id: string
  name: string
}

const initialForm = {
  title: "",
  value: "",
  companyId: "",
  contactId: "",
  expectedClose: "",
}

export function OpportunityFormDialog({
  companies,
  contacts,
}: {
  companies: Option[]
  contacts: Option[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: keyof typeof initialForm, value: string) {
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

    const response = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const payload = await response.json().catch(() => null)
    setIsSubmitting(false)

    if (!response.ok) {
      setError(payload?.error ?? "Nao foi possivel salvar a oportunidade.")
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
        Nova oportunidade
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Nova oportunidade</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Titulo</Label>
              <Input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Ex: Implantacao CRM - Hexagon"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(event) => updateField("value", event.target.value)}
                placeholder="Ex: 15000"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Empresa</Label>
              <Select
                value={form.companyId}
                onValueChange={(value) =>
                  updateField("companyId", (value as string) ?? "")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sem empresa vinculada">
                    {(value: string) =>
                      companies.find((company) => company.id === value)?.name ??
                      "Sem empresa vinculada"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Contato</Label>
              <Select
                value={form.contactId}
                onValueChange={(value) =>
                  updateField("contactId", (value as string) ?? "")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sem contato vinculado">
                    {(value: string) =>
                      contacts.find((contact) => contact.id === value)?.name ??
                      "Sem contato vinculado"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Previsao de fechamento
              </Label>
              <Input
                type="date"
                value={form.expectedClose}
                onChange={(event) =>
                  updateField("expectedClose", event.target.value)
                }
              />
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
              {isSubmitting ? "Salvando..." : "Salvar oportunidade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
