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

const initialForm = {
  name: "",
  segment: "",
  website: "",
  phone: "",
  email: "",
}

export function CompanyFormDialog() {
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

    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const payload = await response.json().catch(() => null)
    setIsSubmitting(false)

    if (!response.ok) {
      setError(payload?.error ?? "Nao foi possivel salvar a empresa.")
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
        Nova empresa
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Nova empresa</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Nome da empresa
              </Label>
              <Input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Ex: Hexagon Tecnologia"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Segmento</Label>
              <Input
                value={form.segment}
                onChange={(event) => updateField("segment", event.target.value)}
                placeholder="Ex: SaaS, Servicos B2B"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Telefone
                </Label>
                <Input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="contato@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Site</Label>
              <Input
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
                placeholder="https://empresa.com"
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
              {isSubmitting ? "Salvando..." : "Salvar empresa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
