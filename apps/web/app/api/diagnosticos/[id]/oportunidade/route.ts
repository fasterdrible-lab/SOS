import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { diagnosticOpportunityMarker } from "@/lib/diagnostico/opportunity-marker"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return NextResponse.json(
      { error: "Usuario sem permissao para converter diagnostico." },
      { status: 401 }
    )
  }

  const { id } = await params

  const diagnostic = await prisma.diagnostic.findFirst({
    where: { id, organizationId },
  })

  if (!diagnostic) {
    return NextResponse.json(
      { error: "Diagnostico nao encontrado." },
      { status: 404 }
    )
  }

  const marker = diagnosticOpportunityMarker(diagnostic.id)

  const existingOpportunity = await prisma.opportunity.findFirst({
    where: { organizationId, notes: { contains: marker } },
  })

  if (existingOpportunity) {
    return NextResponse.json({ opportunity: existingOpportunity })
  }

  try {
    const company =
      (await prisma.company.findFirst({
        where: {
          organizationId,
          name: { equals: diagnostic.companyName, mode: "insensitive" },
        },
      })) ??
      (await prisma.company.create({
        data: {
          organizationId,
          name: diagnostic.companyName,
          segment: diagnostic.segment,
        },
      }))

    const opportunity = await prisma.opportunity.create({
      data: {
        organizationId,
        companyId: company.id,
        title: `Oportunidade - ${diagnostic.companyName}`,
        value: diagnostic.averageTicket,
        notes: `Criada a partir do diagnostico comercial. ${marker}`,
      },
    })

    return NextResponse.json({ opportunity }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel criar a oportunidade." },
      { status: 500 }
    )
  }
}
