import { NextResponse } from "next/server"

import { apiError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { recordAudit } from "@/lib/audit/record"
import { auth } from "@/lib/auth"
import { canCreateOrganization } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { slugifyOrganizationName } from "@/lib/organizations/slug"
import { ensureDefaultPipeline } from "@/lib/pipelines/service"
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

export const POST = withApiErrors("POST /api/organizations", async (request: Request) => {
  const session = await auth()

  if (!session?.user?.id) {
    return apiError("UNAUTHENTICATED", "Nao autorizado.")
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { role: true },
  })

  if (!canCreateOrganization(memberships.map((member) => member.role))) {
    return apiError("FORBIDDEN", "Seu perfil nao tem permissao para esta acao.")
  }

  const body = await request.json().catch(() => null)
  const parsed = organizationInputSchema.safeParse(body)

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Payload invalido.")
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

    await ensureDefaultPipeline(tx, created.id)

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
})
