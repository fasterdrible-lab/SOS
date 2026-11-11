import { NextResponse } from "next/server"
import { z } from "zod"

import { apiError, validationError } from "@/lib/api/errors"
import { withApiErrors } from "@/lib/api/handler"
import { redeemPasswordReset } from "@/lib/members/service"

const bodySchema = z.object({ password: z.string().min(1).max(200) })

/** Nova senha pelo link (rota publica, liberada em lib/auth.config.ts). */
export const POST = withApiErrors(
  "POST /api/password-resets/[token]",
  async (request: Request, { params }: { params: Promise<{ token: string }> }) => {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error)

    const { token } = await params
    const result = await redeemPasswordReset({ token, password: parsed.data.password })
    if (!result.ok) return apiError(result.code, result.message)
    return NextResponse.json({ email: result.email })
  }
)
