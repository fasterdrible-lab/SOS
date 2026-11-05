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

export interface CompanyEditValues {
  name: string
  segment: string
  website: string
  phone: string
  email: string
}

const FIELDS: { key: keyof CompanyEditValues; label: string; type?: string; max: number; required?: boolean }[] = [
  { key: "name", label: "Nome", max: 120, required: true },
  { key: "segment", label: "Segmento", max: 80 },
  { key: "website", label: "Site", max: 200 },
  { key: "phone", label: "Telefone", max: 30 },
  { key: "email", label: "E-mail", type: "email", max: 160 },
]

export function CompanyEditDialog({ id, values }: { id: string; values: CompanyEditValues }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(values)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSaving(true)

    const response = await fetch(`/api/companies/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null)

    setIsSaving(false)

    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as { error?: string } | null
      setError(payload?.error ?? "Nao foi possivel salvar a empresa.")
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
          setForm(values)
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
            <DialogTitle>Editar empresa</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`company-${field.key}`} className="text-xs text-muted-foreground">
                  {field.label}
                </Label>
                <Input
                  id={`company-${field.key}`}
                  type={field.type ?? "text"}
                  value={form[field.key]}
                  onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                  maxLength={field.max}
                  required={field.required}
                />
              </div>
            ))}
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
