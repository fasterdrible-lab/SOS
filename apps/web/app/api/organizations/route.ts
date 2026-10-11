import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
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

  const body = await request.json().catch(() => null)
  const parsed = organizationInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Payload invalido." },
      { status: 400 }
    )
  }

  const slug = await generateUniqueSlug(parsed.data.name)

  const organization = await prisma.organization.create({
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

  return NextResponse.json(organization, { status: 201 })
}
