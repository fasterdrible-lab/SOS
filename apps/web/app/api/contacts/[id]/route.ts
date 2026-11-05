import { NextResponse } from "next/server"

import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { recordAudit } from "@/lib/audit/record"
import { auth } from "@/lib/auth"
import { denyUnless } from "@/lib/authz/guard"
import { prisma } from "@/lib/db"
import { contactEditSchema } from "@/lib/validations/contact"

export const PUT = withApiErrors("PUT /api/contacts/[id]", async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    return apiError("UNAUTHENTICATED", "Usuario sem permissao para editar contato.")
  }

  const denied = denyUnless(session.user.role, "crm:write")
  if (denied) return denied

  const parsed = contactEditSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const { id } = await params
  const existing = await prisma.contact.findFirst({ where: { id, organizationId } })
  if (!existing) return apiError("NOT_FOUND", "Contato nao encontrado.")

  const { companyId } = parsed.data

  if (companyId && companyId !== existing.companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, organizationId },
      select: { id: true },
    })
    if (!company) return apiError("BAD_REQUEST", "Empresa invalida.")

    // Mesma regra das negociacoes: contato e empresa precisam combinar.
    const conflicts = await prisma.opportunity.count({
      where: { organizationId, contactId: id, companyId: { not: companyId } },
    })
    if (conflicts > 0) {
      return apiError("CONFLICT", "Este contato tem negociacoes em outra empresa.")
    }
  }

  const fields = (Object.keys(parsed.data) as (keyof typeof parsed.data)[]).filter(
    (field) => parsed.data[field] !== existing[field]
  )
  if (fields.length === 0) return NextResponse.json({ contact: existing })

  const contact = await prisma.$transaction(async (tx) => {
    const updated = await tx.contact.update({ where: { id }, data: parsed.data })
    await recordAudit(
      {
        organizationId,
        actorUserId: session.user.id,
        action: "contact.updated",
        entityType: "Contact",
        entityId: id,
        metadata: { fields },
      },
      tx
    )
    return updated
  })

  return NextResponse.json({ contact })
})
