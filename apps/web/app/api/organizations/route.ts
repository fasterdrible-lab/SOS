import { NextResponse } from "next/server"

import { recordAudit } from "@/lib/audit/record"
import { auth } from "@/lib/auth"
import { canCreateOrganization } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { slugifyOrganizationName } from "@/lib/organizations/slug"
import { organizationInputSchema } from "@/lib/validations/organization"

const MAX_SLUG_ATTEMPTS = 5

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugifyOrganizationName(name)

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${crypto.randomUUID().slice(0, 6)}`
    const existing = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!existing) return slug
  }

  return `${base}-${crypto.randomUUID().slice(0, 6)}`
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 })
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { role: true },
  })

  if (!canCreateOrganization(memberships.map((member) => member.role))) {
    return NextResponse.json(
      { error: "Seu perfil nao tem permissao para esta acao." },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = organizationInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Payload invalido." },
      { status: 400 }
    )
  }

  const slug = await generateUniqueSlug(parsed.data.name)

  const organization = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name: parsed.data.name,
        slug,
        members: {
          create: {
            userId: session.user.id,
            role: "CONSULTANT",
          },
        },
      },
      select: { id: true, name: true, slug: true },
    })

    await recordAudit(
      {
        organizationId: created.id,
        actorUserId: session.user.id,
        action: "organization.created",
        entityType: "Organization",
        entityId: created.id,
      },
      tx
    )

    return created
  })

  return NextResponse.json(organization, { status: 201 })
}
