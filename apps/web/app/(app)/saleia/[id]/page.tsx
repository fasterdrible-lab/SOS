import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { AccessDenied } from "@/components/access-denied"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { loadPipelineStages } from "@/lib/saleia/decisions"
import {
  INSIGHT_LABELS,
  INSIGHT_ORDER,
  STAGE_STATE_MESSAGES,
  isActionable,
  stageSuggestionState,
} from "@/lib/saleia/rules"
import { getSaleiaMeeting } from "@/lib/saleia/service"
import { BUSINESS_TIME_ZONE } from "@/lib/time/business-calendar"

import { DiagnosisActions } from "../diagnosis-actions"
import { InsightActions } from "../insight-actions"
import { formatMeetingDate } from "../meeting-list"

const dateOnly = new Intl.DateTimeFormat("pt-BR", { timeZone: BUSINESS_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" })

export default async function SaleiaMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const organizationId = session?.user?.organizationId
  const userId = session?.user?.id
  if (!organizationId || !userId) notFound()
  if (!hasPermission(session.user.role, "saleia:read")) return <AccessDenied />

  const { id } = await params
  const meeting = await getSaleiaMeeting({ organizationId, userId, role: session.user.role, id })
  if (!meeting) notFound()

  const stages = meeting.opportunity
    ? await loadPipelineStages(organizationId, meeting.opportunity.pipelineId)
    : []
  const stageStates = new Map(
    meeting.insights
      .filter((insight) => insight.kind === "STAGE_SUGGESTION")
      .map((insight) => [
        insight.id,
        stageSuggestionState({ suggested: insight.stageName, opportunity: meeting.opportunity, stages }),
      ])
  )
  const currentStage = stages.find((stage) => stage.id === meeting.opportunity?.stageId)

  const groups = INSIGHT_ORDER.map((kind) => ({
    kind,
    items: meeting.insights.filter((insight) => insight.kind === kind),
  })).filter((group) => group.items.length > 0)

  const facts = [
    { label: "Data", value: formatMeetingDate(meeting.startedAt) },
    { label: "Duração", value: meeting.durationMinutes !== null ? `${meeting.durationMinutes} min` : "—" },
    {
      label: "Negociação",
      value: meeting.opportunity ? (
        <Link href={`/pipeline/${meeting.opportunity.id}`} className="text-gold-fg hover:underline">{meeting.opportunity.title}</Link>
      ) : "—",
    },
    {
      label: "Empresa",
      value: meeting.company ? (
        <Link href={`/empresas/${meeting.company.id}`} className="text-gold-fg hover:underline">{meeting.company.name}</Link>
      ) : "—",
    },
    { label: "Contato", value: meeting.contact?.name ?? "—" },
    {
      label: "Oferta",
      value:
        meeting.diagnosis.offerPresented === null
          ? "Não avaliada"
          : meeting.diagnosis.offerPresented
            ? "Apresentada"
            : "Não apresentada",
    },
    { label: "Analisada em", value: formatMeetingDate(meeting.analyzedAt) },
  ]

  return (
    <main className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
      <Link href="/saleia" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        SALEIA
      </Link>

      <h1 className="break-words text-2xl font-semibold text-foreground">{meeting.title}</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="border-foreground/5 bg-card py-0">
            <CardContent className="space-y-2 p-5">
              <h2 className="text-sm font-semibold text-foreground">Resumo</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{meeting.summary}</p>
            </CardContent>
          </Card>

          {meeting.diagnosis.offerPresented === false && meeting.diagnosis.status && (
            <Card className="border-foreground/5 bg-card py-0" data-section="so-diagnostico">
              <CardContent className="space-y-2 p-5">
                <h2 className="text-sm font-semibold text-foreground">Só diagnóstico</h2>
                <p className="text-sm text-muted-foreground">A análise diz que a oferta não foi apresentada nesta reunião.</p>
                <DiagnosisActions
                  meetingId={meeting.id}
                  status={meeting.diagnosis.status}
                  suggestedReason={meeting.diagnosis.suggestedReason}
                  reason={meeting.diagnosis.reason}
                />
              </CardContent>
            </Card>
          )}

          {groups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-foreground/10 p-6 text-center text-sm text-muted-foreground">
              O SALEIA não enviou recomendações nem evidências desta reunião.
            </p>
          ) : (
            groups.map((group) => (
              <Card key={group.kind} className="border-foreground/5 bg-card py-0" data-insight-kind={group.kind}>
                <CardContent className="space-y-2 p-5">
                  <h2 className="text-sm font-semibold text-foreground">
                    {INSIGHT_LABELS[group.kind]} ({group.items.length})
                  </h2>
                  <ul className="divide-y divide-foreground/5">
                    {group.items.map((insight) => {
                      const stageState = stageStates.get(insight.id)
                      const blocked =
                        stageState && ["no-opportunity", "closed", "missing"].includes(stageState.state)
                          ? STAGE_STATE_MESSAGES[stageState.state]
                          : null
                      return (
                      <li key={insight.id} className="space-y-1 py-2.5" data-insight-status={insight.status}>
                        <p className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                          <span className="min-w-0 break-words">{insight.text}</span>
                          {insight.stageName && <Badge variant="outline">{insight.stageName}</Badge>}
                          {insight.status !== "OPEN" && (
                            <Badge variant="outline">
                              {insight.status === "ACCEPTED"
                                ? insight.kind === "RECOMMENDATION" ? "Virou atividade" : insight.kind === "STAGE_SUGGESTION" ? "Aplicada" : "Aceita"
                                : "Descartada"}
                            </Badge>
                          )}
                        </p>
                        {insight.quote && (
                          <blockquote className="border-l-2 border-[#D4A64F]/40 pl-3 text-xs italic text-muted-foreground">
                            “{insight.quote}”
                          </blockquote>
                        )}
                        {insight.dueDate && (
                          <p className="text-xs text-muted-foreground">Prazo sugerido: {dateOnly.format(new Date(insight.dueDate))}</p>
                        )}
                        {stageState && insight.status === "OPEN" && (
                          <p className="text-xs text-muted-foreground">
                            {currentStage && stageState.state !== "no-opportunity" && stageState.state !== "closed"
                              ? `Etapa atual: ${currentStage.name}. `
                              : ""}
                            {STAGE_STATE_MESSAGES[stageState.state]}
                          </p>
                        )}
                        {isActionable(insight.kind) && (
                          <InsightActions
                            id={insight.id}
                            kind={insight.kind as "RECOMMENDATION" | "STAGE_SUGGESTION"}
                            status={insight.status}
                            stageName={stageState && "stageName" in stageState ? stageState.stageName : insight.stageName}
                            blockedReason={blocked}
                          />
                        )}
                      </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-foreground/5 bg-card py-0">
            <CardContent className="space-y-2 p-5">
              <dl className="space-y-2 text-sm">
                {facts.map((fact) => (
                  <div key={fact.label} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{fact.label}</dt>
                    <dd className="min-w-0 break-words text-right text-foreground">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="border-foreground/5 bg-card py-0">
            <CardContent className="space-y-2 p-5">
              <h2 className="text-sm font-semibold text-foreground">Participantes ({meeting.participants.length})</h2>
              {meeting.participants.length === 0 ? (
                <p className="text-sm text-muted-foreground">Não informados.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {meeting.participants.map((participant, index) => (
                    <li key={`${participant.email ?? participant.name}-${index}`} className="min-w-0 break-words">
                      <span className="text-foreground">{participant.name}</span>
                      {participant.email && <span className="text-muted-foreground"> · {participant.email}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
