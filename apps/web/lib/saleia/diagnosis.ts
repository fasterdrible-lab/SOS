// "So diagnostico" (V2-8.2): a IA diz que a oferta nao foi apresentada e sugere
// o motivo; uma pessoa confirma (com o motivo sugerido ou reescrito), contesta
// ou desfaz a decisao.
import type { ApiErrorCode } from "@/lib/api/errors"
import { recordAudit, type AuditAction } from "@/lib/audit/record"
import { prisma } from "@/lib/db"
import { planDiagnosisDecision, type DiagnosisAction, type DiagnosisStatus } from "@/lib/saleia/rules"
import { saleiaMeetingScope } from "@/lib/saleia/service"

export type DiagnosisResult =
  | { ok: true; status: DiagnosisStatus; reason: string | null }
  | { ok: false; code: ApiErrorCode; error: string }

const AUDIT_ACTIONS: Record<DiagnosisAction, AuditAction> = {
  confirm: "saleia.diagnosis-confirmed",
  contest: "saleia.diagnosis-contested",
  reopen: "saleia.diagnosis-reopened",
}

export async function decideDiagnosis(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  /** Equipe de quem consulta; restringe o gestor com equipe (V2-9.2). */
  teamId: string | null
  meetingId: string
  action: DiagnosisAction
  /** So em confirm. */
  reason?: string | null
}): Promise<DiagnosisResult> {
  const { organizationId, userId, action } = input

  const meeting = await prisma.saleiaMeeting.findFirst({
    where: { AND: [{ id: input.meetingId, organizationId }, saleiaMeetingScope(input.role, userId, input.teamId)] },
    select: { id: true, offerPresented: true, diagnosisStatus: true },
  })
  if (!meeting) return { ok: false, code: "NOT_FOUND", error: "Reuniao nao encontrada." }

  const decision = planDiagnosisDecision({ offerPresented: meeting.offerPresented, status: meeting.diagnosisStatus, action })
  if (!decision.ok) {
    return { ok: false, code: decision.status === 409 ? "CONFLICT" : "UNPROCESSABLE", error: decision.error }
  }

  const reason = action === "confirm" ? (input.reason ?? null) : null
  const decided = action !== "reopen"

  const changed = await prisma.$transaction(async (tx) => {
    // So troca se ainda for o status lido: duas pessoas nao decidem a mesma reuniao.
    const { count } = await tx.saleiaMeeting.updateMany({
      where: { id: meeting.id, organizationId, diagnosisStatus: decision.from },
      data: {
        diagnosisStatus: decision.to,
        diagnosisReason: reason,
        diagnosisDecidedById: decided ? userId : null,
        diagnosisDecidedAt: decided ? new Date() : null,
      },
    })
    if (count === 0) return false
    await recordAudit(
      {
        organizationId,
        actorUserId: userId,
        action: AUDIT_ACTIONS[action],
        entityType: "SaleiaMeeting",
        entityId: meeting.id,
        metadata: { meetingId: meeting.id },
      },
      tx
    )
    return true
  })

  if (!changed) return { ok: false, code: "CONFLICT", error: "Esta reunião já foi decidida por outra pessoa." }
  return { ok: true, status: decision.to, reason }
}
