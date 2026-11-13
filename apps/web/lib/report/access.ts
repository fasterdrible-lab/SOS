import { assigneeScope, hasPermission } from "@/lib/authz/permissions"
import { getDashboardMembers, type DashboardMember } from "@/lib/dashboard/executive"

/**
 * De quem e o dia mostrado. Sem `reports:team`, sempre o proprio. Com ela, o
 * membro pedido; pedido que nao e membro e invalido (404 na API). O gestor com
 * equipe (V2-9.2) so escolhe pessoas da propria equipe.
 */
export async function resolveReportSubject(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  teamId: string | null
  requested: string | null | undefined
}): Promise<{ subjectId: string; members: DashboardMember[] | null; invalid: boolean }> {
  if (!hasPermission(input.role, "reports:team")) {
    return { subjectId: input.userId, members: null, invalid: false }
  }
  const members = await getDashboardMembers(input.organizationId, assigneeScope(input.role, input.teamId).teamId)
  if (!input.requested) return { subjectId: input.userId, members, invalid: false }
  const valid = members.some((member) => member.userId === input.requested)
  return { subjectId: valid ? input.requested : input.userId, members, invalid: !valid }
}
