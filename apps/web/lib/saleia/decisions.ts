// Decisoes humanas sobre os insights do SALEIA (V2-7.3): aceitar uma recomendacao
// cria uma atividade; aceitar a etapa sugerida move a negociacao. Nada e
// aplicado sem uma pessoa decidir.
import { checkActivityLinks } from "@/lib/activities/service"
import type { ApiErrorCode } from "@/lib/api/errors"
import { recordAudit, type AuditAction } from "@/lib/audit/record"
import { hasPermission, opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"
import { StaleOpportunityError, toStageRef, writeOpportunityChange } from "@/lib/opportunities/change"
import { planOpportunityChange, type OpportunityChange } from "@/lib/opportunities/rules"
import {
  planInsightDecision,
  recommendationActivity,
  stageSuggestionState,
  STAGE_STATE_MESSAGES,
  type InsightAction,
  type InsightStatus,
} from "@/lib/saleia/rules"
import { saleiaMeetingScope } from "@/lib/saleia/service"
import { BUSINESS_TIME_ZONE } from "@/lib/time/business-calendar"

const dateOnly = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export type DecisionResult =
  | { ok: true; status: InsightStatus; activityId: string | null; stageChanged: boolean }
  | { ok: false; code: ApiErrorCode; error: string }

class StaleInsightError extends Error {}

const AUDIT_ACTIONS: Record<InsightAction, AuditAction> = {
  accept: "saleia.insight-accepted",
  dismiss: "saleia.insight-dismissed",
  reopen: "saleia.insight-reopened",
}

/** Etapas do funil, para a etapa sugerida (inclui arquivadas, para achar a posicao atual). */
export function loadPipelineStages(organizationId: string, pipelineId: string) {
  return prisma.pipelineStage
    .findMany({
      where: { organizationId, pipelineId },
      select: { id: true, name: true, position: true, archivedAt: true },
      orderBy: { position: "asc" },
    })
    .then((stages) => stages.map(({ archivedAt, ...stage }) => ({ ...stage, archived: archivedAt !== null })))
}

type Fail = Extract<DecisionResult, { ok: false }>
const fail = (code: ApiErrorCode, error: string): Fail => ({ ok: false, code, error })
const codeOf = (status: number): ApiErrorCode => (status === 403 ? "FORBIDDEN" : status === 409 ? "CONFLICT" : "UNPROCESSABLE")

export async function decideSaleiaInsight(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  /** Equipe de quem consulta; restringe o gestor com equipe (V2-9.2). */
  teamId: string | null
  insightId: string
  action: InsightAction
  now?: Date
}): Promise<DecisionResult> {
  const { organizationId, userId, role, teamId, action } = input
  const now = input.now ?? new Date()

  const insight = await prisma.saleiaInsight.findFirst({
    where: { id: input.insightId, organizationId, meeting: saleiaMeetingScope(role, userId, teamId) },
    include: {
      meeting: {
        select: { id: true, title: true, startedAt: true, companyId: true, contactId: true, opportunityId: true },
      },
    },
  })
  if (!insight) return fail("NOT_FOUND", "Insight nao encontrado.")

  const decision = planInsightDecision({ kind: insight.kind, status: insight.status, action })
  if (!decision.ok) return fail(codeOf(decision.status), decision.error)

  const { meeting } = insight
  const audit = (tx: Prisma.TransactionClient, metadata: Record<string, string | boolean | null>) =>
    recordAudit(
      {
        organizationId,
        actorUserId: userId,
        action: AUDIT_ACTIONS[action],
        entityType: "SaleiaInsight",
        entityId: insight.id,
        metadata: { meetingId: meeting.id, kind: insight.kind, ...metadata },
      },
      tx
    )

  /** Troca o status so se ainda for o lido: duas pessoas nao aceitam o mesmo insight. */
  const markStatus = async (tx: Prisma.TransactionClient) => {
    const { count } = await tx.saleiaInsight.updateMany({
      where: { id: insight.id, organizationId, status: decision.from },
      data: { status: decision.to },
    })
    if (count === 0) throw new StaleInsightError()
  }

  const run = async <T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T | Fail> => {
    try {
      return await prisma.$transaction(work)
    } catch (error) {
      if (error instanceof StaleInsightError) return fail("CONFLICT", "Este insight ja foi decidido por outra pessoa.")
      if (error instanceof StaleOpportunityError) {
        return fail("CONFLICT", "A negociacao foi alterada por outra pessoa. Atualize a pagina.")
      }
      throw error
    }
  }

  if (action !== "accept") {
    const result = await run(async (tx) => {
      await markStatus(tx)
      await audit(tx, {})
    })
    if (result && "ok" in result) return result
    return { ok: true, status: decision.to, activityId: null, stageChanged: false }
  }

  if (insight.kind === "RECOMMENDATION") {
    if (!hasPermission(role, "activities:write")) return fail("FORBIDDEN", "Sem permissao para criar atividades.")
    return acceptRecommendation()
  }

  if (!hasPermission(role, "opportunities:write")) return fail("FORBIDDEN", "Sem permissao para mover negociacoes.")
  return acceptStage()

  async function acceptRecommendation(): Promise<DecisionResult> {
    // A negociacao ja traz empresa e contato; sem ela, empresa e contato da reuniao.
    let links = await checkActivityLinks({
      organizationId,
      userId,
      role, teamId,
      opportunityId: meeting.opportunityId,
      companyId: meeting.opportunityId ? null : meeting.companyId,
      contactId: meeting.opportunityId ? null : meeting.contactId,
    })
    if (!links.ok && !meeting.opportunityId && meeting.companyId) {
      links = await checkActivityLinks({ organizationId, userId, role, teamId, opportunityId: null, companyId: meeting.companyId, contactId: null })
    }
    if (!links.ok) return fail("UNPROCESSABLE", links.error)
    const linked = links

    // A atividade fica com o dono da negociacao (o vendedor so ve as proprias).
    const opportunity = linked.opportunityId
      ? await prisma.opportunity.findFirst({ where: { id: linked.opportunityId, organizationId }, select: { ownerId: true } })
      : null
    const ownerId = opportunity?.ownerId ?? userId

    const activity = recommendationActivity({
      text: insight!.text,
      quote: insight!.quote,
      dueDate: insight!.dueDate,
      meetingTitle: meeting.title,
      meetingDate: dateOnly.format(meeting.startedAt),
    })

    const result = await run(async (tx) => {
      await markStatus(tx)
      const created = await tx.activity.create({
        data: {
          organizationId,
          ownerId,
          ...activity,
          companyId: linked.companyId,
          contactId: linked.contactId,
          opportunityId: linked.opportunityId,
        },
        select: { id: true },
      })
      await audit(tx, { activityId: created.id })
      return created.id
    })
    if (typeof result !== "string") return result
    return { ok: true, status: "ACCEPTED", activityId: result, stageChanged: false }
  }

  async function acceptStage(): Promise<DecisionResult> {
    const opportunity = meeting.opportunityId
      ? await prisma.opportunity.findFirst({
          where: { id: meeting.opportunityId, organizationId, ...opportunityScope(role, userId, teamId) },
          include: {
            stage: { select: { id: true, pipelineId: true, probability: true, archivedAt: true, requiredFields: true } },
          },
        })
      : null

    const stages = opportunity ? await loadPipelineStages(organizationId, opportunity.pipelineId) : []
    const target = stageSuggestionState({ suggested: insight!.stageName, opportunity, stages })

    if (!("stageId" in target)) {
      const error =
        target.state === "missing"
          ? `O funil desta negociacao nao tem a etapa "${insight!.stageName}".`
          : STAGE_STATE_MESSAGES[target.state]
      return fail("UNPROCESSABLE", error)
    }
    const current = opportunity!
    const isCurrent = target.state === "current"
    const targetStageId = target.stageId

    let change: OpportunityChange | null = null
    if (!isCurrent) {
      const stage = await prisma.pipelineStage.findFirstOrThrow({
        where: { id: targetStageId, organizationId },
        select: { id: true, pipelineId: true, probability: true, archivedAt: true, requiredFields: true },
      })
      const transition = planOpportunityChange({
        current: {
          status: current.status,
          stage: toStageRef(current.stage),
          data: {
            value: Number(current.value),
            companyId: current.companyId,
            contactId: current.contactId,
            expectedClose: current.expectedClose,
          },
        },
        targetStage: toStageRef(stage),
        canReopen: hasPermission(role, "opportunities:reopen"),
        now,
      })
      if (!transition.ok) return fail(codeOf(transition.status), transition.error)
      change = transition.unchanged ? null : transition.data
    }

    const result = await run(async (tx) => {
      await markStatus(tx)
      if (change) {
        await writeOpportunityChange(tx, {
          organizationId,
          opportunityId: current.id,
          from: { stageId: current.stageId, status: current.status },
          change,
          changedById: userId,
        })
      }
      await audit(tx, { opportunityId: current.id, stageId: isCurrent ? null : targetStageId,stageChanged: Boolean(change) })
      return Boolean(change)
    })
    if (typeof result !== "boolean") return result
    return { ok: true, status: "ACCEPTED", activityId: null, stageChanged: result }
  }
}
