"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"

type DiagnosticForm = {
  companyName: string
  segment: string
  revenue: string
  sellers: string
  monthlyLeads: string
  averageTicket: string
  conversionRate: string
  crmUsed: string
  commercialProcess: string
  painPoints: string
}

type FieldKey = keyof DiagnosticForm

const initialForm: DiagnosticForm = {
  companyName: "",
  segment: "",
  revenue: "",
  sellers: "",
  monthlyLeads: "",
  averageTicket: "",
  conversionRate: "",
  crmUsed: "",
  commercialProcess: "",
  painPoints: "",
}

const steps = [
  {
    title: "Empresa",
    description: "Contexto basico da operacao.",
    fields: ["companyName", "segment", "revenue"] satisfies FieldKey[],
  },
  {
    title: "Numeros comerciais",
    description: "Volume, equipe e eficiencia atual.",
    fields: [
      "sellers",
      "monthlyLeads",
      "averageTicket",
      "conversionRate",
    ] satisfies FieldKey[],
  },
  {
    title: "Processo",
    description: "Ferramentas, rotina e principais dores.",
    fields: ["commercialProcess", "painPoints"] satisfies FieldKey[],
  },
  {
    title: "Revisao",
    description: "Confirme os dados antes de salvar.",
    fields: [] satisfies FieldKey[],
  },
]

const revenueOptions = [
  "Ate R$ 50 mil/mes",
  "R$ 50 mil a R$ 200 mil/mes",
  "R$ 200 mil a R$ 500 mil/mes",
  "R$ 500 mil a R$ 1 mi/mes",
  "Acima de R$ 1 mi/mes",
]

const segmentOptions = [
  "Servicos B2B",
  "SaaS / Tecnologia",
  "Industria",
  "Varejo",
  "Educacao",
  "Saude",
  "Outro",
]

export function DiagnosticWizard() {
  const [form, setForm] = useState<DiagnosticForm>(initialForm)
  const [step, setStep] = useState(0)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedId, setSavedId] = useState("")

  const progress = ((step + 1) / steps.length) * 100
  const isLastStep = step === steps.length - 1

  function updateField(field: FieldKey, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError("")
  }

  function validateCurrentStep() {
    const emptyField = steps[step].fields.find((field) => !form[field].trim())

    if (emptyField) {
      setError("Preencha os campos obrigatorios antes de continuar.")
      return false
    }

    return true
  }

  function goNext() {
    if (!validateCurrentStep()) return
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  function goBack() {
    setError("")
    setStep((current) => Math.max(current - 1, 0))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    const response = await fetch("/api/diagnosticos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const payload = await response.json().catch(() => null)
    setIsSubmitting(false)

    if (!response.ok) {
      setError(payload?.error ?? "Nao foi possivel salvar o diagnostico.")
      return
    }

    setSavedId(payload.diagnostic.id)
  }

  if (savedId) {
    return (
      <Card className="mx-auto max-w-3xl border-white/5 bg-card">
        <CardContent className="flex flex-col items-center py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white">
            Diagnostico salvo
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Os dados foram registrados. Veja a nota, os gargalos e as
            recomendacoes do diagnostico.
          </p>
          <Link
            href={`/diagnostico/${savedId}`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#D4A64F] px-5 py-2.5 text-sm font-semibold text-[#1E1B3A] transition-colors hover:bg-[#E0B85A]"
          >
            Ver resultado
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="border-white/5 bg-card">
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4A64F]/10">
                  <ClipboardList className="h-5 w-5 text-[#D4A64F]" />
                </div>
                <CardTitle className="text-2xl text-white">
                  Diagnostico Comercial
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {steps[step].description}
                </p>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">
                Etapa {step + 1} de {steps.length}
              </div>
            </div>
            <Progress value={progress} className="[&_[data-slot=progress-indicator]]:bg-[#D4A64F]" />
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome da empresa">
                  <Input
                    value={form.companyName}
                    onChange={(event) =>
                      updateField("companyName", event.target.value)
                    }
                    placeholder="Ex: Hexagon Tecnologia"
                  />
                </Field>

                <Field label="Segmento">
                  <NativeSelect
                    value={form.segment}
                    onChange={(value) => updateField("segment", value)}
                    options={segmentOptions}
                    placeholder="Selecione o segmento"
                  />
                </Field>

                <Field label="Faturamento mensal">
                  <NativeSelect
                    value={form.revenue}
                    onChange={(value) => updateField("revenue", value)}
                    options={revenueOptions}
                    placeholder="Selecione a faixa"
                  />
                </Field>

                <Field label="CRM utilizado">
                  <Input
                    value={form.crmUsed}
                    onChange={(event) => updateField("crmUsed", event.target.value)}
                    placeholder="Ex: HubSpot, Pipedrive, planilha"
                  />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Numero de vendedores">
                  <Input
                    type="number"
                    min="1"
                    value={form.sellers}
                    onChange={(event) => updateField("sellers", event.target.value)}
                    placeholder="Ex: 4"
                  />
                </Field>

                <Field label="Leads por mes">
                  <Input
                    type="number"
                    min="0"
                    value={form.monthlyLeads}
                    onChange={(event) =>
                      updateField("monthlyLeads", event.target.value)
                    }
                    placeholder="Ex: 120"
                  />
                </Field>

                <Field label="Ticket medio">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.averageTicket}
                    onChange={(event) =>
                      updateField("averageTicket", event.target.value)
                    }
                    placeholder="Ex: 3500"
                  />
                </Field>

                <Field label="Conversao (%)">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.conversionRate}
                    onChange={(event) =>
                      updateField("conversionRate", event.target.value)
                    }
                    placeholder="Ex: 12"
                  />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4">
                <Field label="Processo comercial atual">
                  <Textarea
                    value={form.commercialProcess}
                    onChange={(event) =>
                      updateField("commercialProcess", event.target.value)
                    }
                    placeholder="Descreva como leads entram, sao qualificados, acompanhados e fechados."
                    className="min-h-28"
                  />
                </Field>

                <Field label="Principais dores">
                  <Textarea
                    value={form.painPoints}
                    onChange={(event) =>
                      updateField("painPoints", event.target.value)
                    }
                    placeholder="Ex: baixa conversao, falta de follow-up, pipeline sem previsibilidade..."
                    className="min-h-28"
                  />
                </Field>
              </div>
            )}

            {step === 3 && <Review form={form} />}

            {error && (
              <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={step === 0 || isSubmitting}
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>

              {isLastStep ? (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Salvando..." : "Salvar diagnostico"}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={goNext}
                  className="bg-[#D4A64F] text-[#1E1B3A] hover:bg-[#E0B85A]"
                >
                  Proximo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit border-white/5 bg-card">
          <CardHeader>
            <CardTitle className="text-base text-white">Etapas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setStep(index)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                  index === step
                    ? "border-[#D4A64F]/40 bg-[#D4A64F]/10"
                    : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                }`}
              >
                <span className="text-sm font-medium text-white">
                  {item.title}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {item.description}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-white outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      <option value="" className="bg-[#1E1B3A]">
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option} value={option} className="bg-[#1E1B3A]">
          {option}
        </option>
      ))}
    </select>
  )
}

function Review({ form }: { form: DiagnosticForm }) {
  const items = [
    ["Empresa", form.companyName],
    ["Segmento", form.segment],
    ["Faturamento", form.revenue],
    ["Vendedores", form.sellers],
    ["Leads/mes", form.monthlyLeads],
    ["Ticket medio", form.averageTicket],
    ["Conversao", `${form.conversionRate}%`],
    ["CRM", form.crmUsed || "Nao informado"],
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <p className="mt-1 text-sm font-medium text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Processo comercial
        </span>
        <p className="mt-1 text-sm text-white">{form.commercialProcess}</p>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Dores principais
        </span>
        <p className="mt-1 text-sm text-white">{form.painPoints}</p>
      </div>
    </div>
  )
}
