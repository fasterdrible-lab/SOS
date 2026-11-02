import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ArrowUpRight, Lightbulb } from "lucide-react"

import { auth } from "@/lib/auth"
import { opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { diagnosticActionPlanId } from "@/lib/diagnostico/action-plan-id"
import { diagnosticOpportunityMarker } from "@/lib/diagnostico/opportunity-marker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import { CreateOpportunityButton } from "./create-opportunity-button"
import { CreatePlanButton } from "./create-plan-button"

type DiagnosticInsight = {
  title: string
  detail: string
}

function maturityLabel(score: number): string {
  if (score >= 70) return "Operacao avancada"
  if (score >= 40) return "Em estruturacao"
  return "Estagio inicial"
}

export default async function DiagnosticoResultadoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    notFound()
  }

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { id, organizationId },
  })

  if (!diagnostic) {
    notFound()
  }

  const bottlenecks = (diagnostic.bottlenecks as DiagnosticInsight[] | null) ?? []
  const recommendations = (diagnostic.recommendations as DiagnosticInsight[] | null) ?? []

  const existingOpportunity = await prisma.opportunity.findFirst({
    where: {
      organizationId,
      notes: { contains: diagnosticOpportunityMarker(diagnostic.id) },
      ...opportunityScope(session?.user?.role, session?.user?.id ?? ""),
    },
    select: { id: true },
  })

  const existingActionPlan = await prisma.actionPlan.findFirst({
    where: { id: diagnosticActionPlanId(diagnostic.id), organizationId },
    select: { id: true },
  })

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Card className="border-foreground/5 bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">
                {diagnostic.companyName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Nota de maturidade comercial
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-foreground">
                  {diagnostic.maturityScore}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <Progress
                value={diagnostic.maturityScore}
                className="[&_[data-slot=progress-indicator]]:bg-[#D4A64F]"
              />
              <p className="text-sm text-muted-foreground">
                {maturityLabel(diagnostic.maturityScore)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-foreground/5 bg-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-400/10">
                  <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                </div>
                <CardTitle className="text-base text-foreground">
                  Gargalos identificados
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {bottlenecks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum gargalo critico identificado nesta avaliacao.
                </p>
              ) : (
                bottlenecks.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-lg border border-foreground/5 bg-foreground/[0.02] p-3"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-foreground/5 bg-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#D4A64F]/10">
                  <Lightbulb className="h-4 w-4 text-gold-fg" />
                </div>
                <CardTitle className="text-base text-foreground">
                  Recomendacoes
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-foreground/5 bg-foreground/[0.02] p-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-4">
            <CreateOpportunityButton
              diagnosticId={diagnostic.id}
              hasOpportunity={Boolean(existingOpportunity)}
            />

            <CreatePlanButton
              diagnosticId={diagnostic.id}
              hasActionPlan={Boolean(existingActionPlan)}
            />

            <Link
              href="/diagnostico"
              className="inline-flex items-center gap-2 text-sm font-medium text-gold-fg hover:text-gold-fg/80"
            >
              Novo diagnostico
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
