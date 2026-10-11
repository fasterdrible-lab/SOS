import { NextResponse } from "next/server"

import { auth, unstable_update } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sessionOrganizationInputSchema } from "@/lib/validations/session-organization"

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = sessionOrganizationInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
  }

  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: parsed.data.organizationId,
        userId: session.user.id,
      },
    },
    select: { organizationId: true, role: true },
  })

  if (!member) {
    return NextResponse.json(
      { error: "Voce nao pertence a essa organizacao." },
      { status: 404 }
    )
  }

  await unstable_update({ user: { organizationId: member.organizationId } })

  return NextResponse.json({ organizationId: member.organizationId, role: member.role })
}
