"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Loader2, Plus, Settings2, Trash2 } from "lucide-react"

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
import type { PipelineSummary } from "@/lib/pipelines/service"
import { REQUIRABLE_FIELDS } from "@/lib/opportunities/rules"
import { MAX_STAGES } from "@/lib/pipelines/defaults"

interface StageDraft {
  /** Chave local da linha; `id` so existe para etapas ja gravadas. */
  key: string
  id?: string
  name: string
  probability: string
  isProposal: boolean
  requiredFields: string[]
}

const NEW_PIPELINE = "novo"

function draftOf(pipeline: PipelineSummary | undefined): { name: string; stages: StageDraft[] } {
  if (!pipeline) {
    return {
      name: "",
      stages: [
        { key: "n1", name: "Primeiro contato", probability: "10", isProposal: false, requiredFields: [] },
        { key: "n2", name: "Proposta", probability: "50", isProposal: true, requiredFields: [] },
      ],
    }
  }
  return {
    name: pipeline.name,
    stages: pipeline.stages.map((stage) => ({
      key: stage.id,
      id: stage.id,
      name: stage.name,
      probability: String(stage.probability),
      isProposal: stage.isProposal,
      requiredFields: stage.requiredFields,
    })),
  }
}

export function PipelineEditorDialog({
  pipelines,
  currentId,
}: {
  pipelines: PipelineSummary[]
  currentId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(currentId)
  const [draft, setDraft] = useState(() => draftOf(pipelines.find((item) => item.id === currentId)))
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [counter, setCounter] = useState(0)

  const editing = pipelines.find((item) => item.id === selected)

  function select(id: string) {
    setSelected(id)
    setDraft(draftOf(pipelines.find((item) => item.id === id)))
    setError("")
  }

  function updateStage(key: string, change: Partial<StageDraft>) {
    setDraft((current) => ({
      ...current,
      stages: current.stages.map((stage) => (stage.key === key ? { ...stage, ...change } : stage)),
    }))
  }

  function move(index: number, offset: number) {
    setDraft((current) => {
      const stages = [...current.stages]
      const [stage] = stages.splice(index, 1)
      stages.splice(index + offset, 0, stage)
      return { ...current, stages }
    })
  }

  function addStage() {
    setCounter((value) => value + 1)
    setDraft((current) => ({
      ...current,
      stages: [
        ...current.stages,
        { key: `novo-${counter}`, name: "", probability: "50", isProposal: false, requiredFields: [] },
      ],
    }))
  }

  async function send(method: string, url: string, body?: unknown) {
    setError("")
    setIsSaving(true)
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const payload = await response.json().catch(() => null)
    setIsSaving(false)
    if (!response.ok) {
      setError(payload?.error ?? "Nao foi possivel salvar o funil.")
      return null
    }
    return payload
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = {
      name: draft.name,
      stages: draft.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        probability: Number(stage.probability),
        isProposal: stage.isProposal,
        requiredFields: stage.requiredFields,
      })),
    }
    const payload = editing
      ? await send("PUT", `/api/pipelines/${editing.id}`, body)
      : await send("POST", "/api/pipelines", body)
    if (!payload) return

    setOpen(false)
    if (!editing && payload.pipeline?.id) {
      router.push(`/pipeline?funil=${payload.pipeline.id}`)
    }
    router.refresh()
  }

  async function archive() {
    if (!editing) return
    const payload = await send("DELETE", `/api/pipelines/${editing.id}`)
    if (!payload) return
    setOpen(false)
    router.push("/pipeline")
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) select(currentId)
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <Settings2 className="h-4 w-4" />
        Funis
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Funis e etapas</DialogTitle>
            <DialogDescription>
              A ordem das etapas é a do quadro. Etapa removida some do quadro; negociações em andamento
              precisam ser movidas antes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="pipeline-select" className="text-xs text-muted-foreground">
              Funil
            </Label>
            <select
              id="pipeline-select"
              value={selected}
              onChange={(event) => select(event.target.value)}
              className="h-9 w-full rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                  {pipeline.isDefault ? " (padrão)" : ""}
                </option>
              ))}
              <option value={NEW_PIPELINE}>+ Novo funil</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pipeline-name" className="text-xs text-muted-foreground">
              Nome
            </Label>
            <Input
              id="pipeline-name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ex: Inside sales"
              maxLength={60}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_4.5rem_auto] gap-2 px-1 text-[11px] uppercase tracking-widest text-muted-foreground">
              <span>Etapa</span>
              <span>Prob. %</span>
              <span className="sr-only">Ações</span>
            </div>
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {draft.stages.map((stage, index) => (
                <li key={stage.key} className="space-y-1 rounded-lg border border-foreground/5 p-2">
                  <div className="grid grid-cols-[1fr_4.5rem_auto] items-center gap-2">
                    <Input
                      value={stage.name}
                      onChange={(event) => updateStage(stage.key, { name: event.target.value })}
                      aria-label={`Nome da etapa ${index + 1}`}
                      maxLength={60}
                      required
                      className="h-8"
                    />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={stage.probability}
                      onChange={(event) => updateStage(stage.key, { probability: event.target.value })}
                      aria-label={`Probabilidade da etapa ${index + 1}`}
                      required
                      className="h-8"
                    />
                    <div className="flex">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label="Subir etapa"
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === draft.stages.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label="Descer etapa"
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={draft.stages.length === 1}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            stages: current.stages.filter((item) => item.key !== stage.key),
                          }))
                        }
                        aria-label="Remover etapa"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={stage.isProposal}
                      onChange={(event) => updateStage(stage.key, { isProposal: event.target.checked })}
                    />
                    Etapa de proposta (entra em &quot;Propostas aguardando resposta&quot;)
                  </label>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-muted-foreground">
                    <span>Exige:</span>
                    {REQUIRABLE_FIELDS.map((field) => (
                      <label key={field.key} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={stage.requiredFields.includes(field.key)}
                          onChange={(event) =>
                            updateStage(stage.key, {
                              requiredFields: event.target.checked
                                ? [...stage.requiredFields, field.key]
                                : stage.requiredFields.filter((key) => key !== field.key),
                            })
                          }
                        />
                        {field.label}
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={addStage}
              disabled={draft.stages.length >= MAX_STAGES}
            >
              <Plus className="h-4 w-4" />
              Adicionar etapa
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <DialogFooter className="-mx-4 -mb-4">
            {editing && !editing.isDefault && (
              <Button type="button" variant="ghost" onClick={archive} disabled={isSaving} className="sm:mr-auto">
                Remover funil
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Salvar funil" : "Criar funil"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
