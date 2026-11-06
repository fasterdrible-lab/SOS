import { NextResponse } from "next/server"

import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { prisma } from "@/lib/db"
import { ingestSaleiaEvent } from "@/lib/saleia/service"
import { verifySaleiaSignature } from "@/lib/saleia/signature"
import { decryptSecret } from "@/lib/security/crypto"
import { MAX_EVENT_BYTES, saleiaEventSchema } from "@/lib/validations/saleia-event"

type Context = { params: Promise<{ organizationId: string }> }

const SCOPE = "POST /api/integrations/saleia/[organizationId]/events"

/** Mesma resposta para organizacao sem integracao e assinatura invalida. */
const unauthorized = () => apiError("UNAUTHENTICATED", "Assinatura invalida.")

/**
 * Recebe eventos do SALE-IA (docs/INTEGRACAO_SALEIA.md). Publica, sem sessao:
 * a autenticacao e a assinatura HMAC com o segredo da organizacao.
 */
export const POST = withApiErrors(SCOPE, async (request: Request, { params }: Context) => {
  const { organizationId } = await params

  const declared = Number(request.headers.get("content-length") ?? 0)
  if (declared > MAX_EVENT_BYTES) return apiError("BAD_REQUEST", "Evento muito grande.")

  const body = await request.text()
  if (Buffer.byteLength(body) > MAX_EVENT_BYTES) return apiError("BAD_REQUEST", "Evento muito grande.")

  const integration = await prisma.saleiaIntegration.findUnique({
    where: { organizationId },
    select: { secretEncrypted: true },
  })
  if (!integration) return unauthorized()

  const check = verifySaleiaSignature({
    secret: decryptSecret(integration.secretEncrypted),
    timestamp: request.headers.get("x-saleia-timestamp"),
    signature: request.headers.get("x-saleia-signature"),
    body,
    now: new Date(),
  })
  if (!check.ok) {
    console.warn(JSON.stringify({ level: "warn", scope: SCOPE, at: new Date().toISOString(), reason: check.reason }))
    return unauthorized()
  }

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return apiError("BAD_REQUEST", "JSON invalido.")
  }

  const parsed = saleiaEventSchema.safeParse(json)
  if (!parsed.success) return validationError(parsed.error)

  const result = await ingestSaleiaEvent(organizationId, parsed.data)

  return NextResponse.json(
    {
      meetingId: result.meetingId,
      created: result.created,
      linked: {
        opportunityId: result.match.opportunityId,
        companyId: result.match.companyId,
        contactId: result.match.contactId,
        via: result.match.via,
      },
    },
    { status: result.created ? 201 : 200 }
  )
})
