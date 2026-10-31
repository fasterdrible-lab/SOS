import { NextResponse } from "next/server"

import { apiError, logServerError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { getAccessLevel } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import {
  diagnosticOpportunityId,
  diagnosticOpportunityMarker,
} from "@/lib/diagnostico/opportunity-marker"
import {
  createOpportunity,
  isUniqueConstraintError,
  serializeOpportunity,
} from "@/lib/opportunities/create"
import type { Opportunity } from "@/lib/generated/prisma/client"

export const POST = withApiErrors("POST /api/diagnosticos/[id]/oportunidade", async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para converter diagnostico.")
  }

  const denied = denyUnless(session.user.role, "opportunities:write")
  if (denied) return denied

  const { id } = await params

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { id, organizationId },
  })

  if (!diagnostic) {
    return apiError("NOT_FOUND", "Diagnostico nao encontrado.")
  }

  const opportunityId = diagnosticOpportunityId(diagnostic.id)
  const marker = diagnosticOpportunityMarker(diagnostic.id)

  // O marcador em `notes` cobre oportunidades criadas antes do id deterministico.
  const findExisting = () =>
    prisma.opportunity.findFirst({
      where: {
        organizationId,
        OR: [{ id: opportunityId }, { notes: { contains: marker } }],
      },
    })

  const respondWithExisting = (opportunity: Opportunity) => {
    if (
      getAccessLevel(session.user.role) === "SELLER" &&
      opportunity.ownerId !== session.user.id
    ) {
      return apiError("CONFLICT", "A oportunidade deste diagnostico pertence a outro vendedor.")
    }

    return NextResponse.json({ opportunity: serializeOpportunity(opportunity) })
  }

  const existingOpportunity = await findExisting()

  if (existingOpportunity) return respondWithExisting(existingOpportunity)

  try {
    const opportunity = await prisma.$transaction(async (tx) => {
      const company =
        (await tx.company.findFirst({
          where: {
            organizationId,
            name: { equals: diagnostic.companyName, mode: "insensitive" },
          },
        })) ??
        (await tx.company.create({
          data: {
            organizationId,
            name: diagnostic.companyName,
            segment: diagnostic.segment,
          },
        }))

      return createOpportunity(
        tx,
        {
          id: opportunityId,
          organizationId,
          ownerId: session.user.id,
          companyId: company.id,
          title: `Oportunidade - ${diagnostic.companyName}`,
          value: diagnostic.averageTicket,
          notes: `Criada a partir do diagnostico comercial. ${marker}`,
        },
        session.user.id
      )
    })

    return NextResponse.json(
      { opportunity: serializeOpportunity(opportunity) },
      { status: 201 }
    )
  } catch (error) {
    // Pedido simultaneo criou a mesma oportunidade primeiro.
    if (isUniqueConstraintError(error)) {
      const created = await findExisting()
      if (created) return respondWithExisting(created)
    }

    logServerError("POST /api/diagnosticos/[id]/oportunidade", error)
    return apiError("INTERNAL", "Nao foi possivel criar a oportunidade.")
  }
})
