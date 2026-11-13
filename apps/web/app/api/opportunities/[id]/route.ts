import { NextResponse } from "next/server"

import { apiError, codeForStatus, logServerError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { hasPermission, opportunityScope, assigneeScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { recordAudit } from "@/lib/audit/record"
import { StaleOpportunityError, toStageRef, writeOpportunityChange } from "@/lib/opportunities/change"
import { serializeOpportunity } from "@/lib/opportunities/create"
import { getOpportunityDetail } from "@/lib/opportunities/detail"
import {
  planOpportunityChange,
  planOpportunityEdit,
  resolveOpportunityLinks,
} from "@/lib/opportunities/rules"
import { findStage } from "@/lib/pipelines/service"
import { opportunityChangeSchema, opportunityEditSchema } from "@/lib/validations/opportunity"

export const GET = withApiErrors("GET /api/opportunities/[id]", async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para ver oportunidade.")
  }

  const denied = denyUnless(session.user.role, "opportunities:read")
  if (denied) return denied

  const opportunity = await getOpportunityDetail({
    id: (await params).id,
    organizationId,
    userId: session.user.id,
    role: session.user.role, teamId: session.user.teamId,
  })

  if (!opportunity) {
    return apiError("NOT_FOUND", "Oportunidade nao encontrada.")
  }

  return NextResponse.json({ opportunity })
})

/** Edita os dados da negociacao. Etapa e status mudam pelo PATCH. */
export const PUT = withApiErrors("PUT /api/opportunities/[id]", async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para editar oportunidade.")
  }

  const denied = denyUnless(session.user.role, "opportunities:write")
  if (denied) return denied

  const parsed = opportunityEditSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const { id } = await params
  const existing = await prisma.opportunity.findFirst({
    where: { id, organizationId, ...opportunityScope(session.user.role, session.user.id, session.user.teamId) },
    include: { stage: { select: { requiredFields: true } } },
  })

  if (!existing) {
    return apiError("NOT_FOUND", "Oportunidade nao encontrada.")
  }

  const { stage: editedStage, ...stored } = existing
  const { expectedClose, ...fields } = parsed.data
  const next = {
    ...fields,
    expectedClose:
      expectedClose === undefined ? undefined : expectedClose === null ? null : new Date(expectedClose),
  }

  if (next.companyId !== undefined || next.contactId !== undefined) {
    const companyId = next.companyId === undefined ? existing.companyId : next.companyId
    const contactId = next.contactId === undefined ? existing.contactId : next.contactId

    if (companyId) {
      const company = await prisma.company.findFirst({
        where: { id: companyId, organizationId },
        select: { id: true },
      })
      if (!company) return apiError("BAD_REQUEST", "Empresa invalida.")
    }

    const contact = contactId
      ? await prisma.contact.findFirst({
          where: { id: contactId, organizationId },
          select: { companyId: true },
        })
      : null
    if (contactId && !contact) return apiError("BAD_REQUEST", "Contato invalido.")

    const links = resolveOpportunityLinks({ companyId, contact })
    if (!links.ok) return apiError("BAD_REQUEST", links.error)
    next.companyId = links.companyId
  }

  if (next.ownerId) {
    const member = await prisma.organizationMember.findFirst({
      where: { organizationId, userId: next.ownerId, ...assigneeScope(session.user.role, session.user.teamId) },
      select: { id: true },
    })
    if (!member) return apiError("BAD_REQUEST", "Dono invalido ou de outra equipe.")
  }

  const plan = planOpportunityEdit({
    current: {
      title: existing.title,
      value: Number(existing.value),
      companyId: existing.companyId,
      contactId: existing.contactId,
      ownerId: existing.ownerId,
      expectedClose: existing.expectedClose,
      notes: existing.notes,
    },
    next,
    status: existing.status,
    requiredFields: editedStage.requiredFields,
    canAssign: hasPermission(session.user.role, "opportunities:assign"),
    canEditClosed: hasPermission(session.user.role, "opportunities:reopen"),
  })

  if (!plan.ok) return apiError(codeForStatus(plan.status), plan.error)

  if (plan.fields.length === 0) {
    return NextResponse.json({ opportunity: serializeOpportunity(stored) })
  }

  const opportunity = await prisma.$transaction(async (tx) => {
    const updated = await tx.opportunity.update({ where: { id }, data: plan.changes })
    await recordAudit(
      {
        organizationId,
        actorUserId: session.user.id,
        action: "opportunity.updated",
        entityType: "Opportunity",
        entityId: id,
        metadata: { fields: plan.fields },
      },
      tx
    )
    return updated
  })

  return NextResponse.json({ opportunity: serializeOpportunity(opportunity) })
})

export const PATCH = withApiErrors("PATCH /api/opportunities/[id]", async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para atualizar oportunidade.")
  }

  const denied = denyUnless(session.user.role, "opportunities:write")
  if (denied) return denied

  const { id } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return apiError("BAD_REQUEST", "Payload invalido.")
  }

  const parsed = opportunityChangeSchema.safeParse(body)

  if (!parsed.success) {
    return validationError(parsed.error)
  }

  const existing = await prisma.opportunity.findFirst({
    where: {
      id,
      organizationId,
      ...opportunityScope(session.user.role, session.user.id, session.user.teamId),
    },
    include: {
      stage: {
        select: { id: true, pipelineId: true, probability: true, archivedAt: true, requiredFields: true },
      },
    },
  })

  if (!existing) {
    return apiError("NOT_FOUND", "Oportunidade nao encontrada.")
  }

  const targetStage = parsed.data.stageId
    ? await findStage(prisma, organizationId, parsed.data.stageId)
    : undefined

  if (parsed.data.stageId && !targetStage) {
    return apiError("BAD_REQUEST", "Etapa invalida.")
  }

  const { stage: currentStage, ...current } = existing

  const transition = planOpportunityChange({
    current: {
      status: current.status,
      stage: toStageRef(currentStage),
      data: {
        value: Number(current.value),
        companyId: current.companyId,
        contactId: current.contactId,
        expectedClose: current.expectedClose,
      },
    },
    targetStage,
    targetStatus: parsed.data.status,
    lostReason: parsed.data.lostReason,
    canReopen: hasPermission(session.user.role, "opportunities:reopen"),
    now: new Date(),
  })

  if (!transition.ok) {
    return apiError(codeForStatus(transition.status), transition.error)
  }

  if (transition.unchanged) {
    return NextResponse.json({ opportunity: serializeOpportunity(current) })
  }

  const change = transition.data

  try {
    const opportunity = await prisma.$transaction(async (tx) => {
      await writeOpportunityChange(tx, {
        organizationId,
        opportunityId: id,
        from: { stageId: existing.stageId, status: existing.status },
        change,
        changedById: session.user.id,
      })

      return tx.opportunity.findUniqueOrThrow({ where: { id } })
    })

    return NextResponse.json({ opportunity: serializeOpportunity(opportunity) })
  } catch (error) {
    if (error instanceof StaleOpportunityError) {
      return apiError("CONFLICT", "A oportunidade foi alterada por outra pessoa. Atualize a pagina.")
    }

    logServerError("PATCH /api/opportunities/[id]", error)
    return apiError("INTERNAL", "Nao foi possivel atualizar a oportunidade.")
  }
})
