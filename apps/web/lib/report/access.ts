import { hasPermission } from "@/lib/authz/permissions"
import { getDashboardMembers, type DashboardMember } from "@/lib/dashboard/executive"

/**
 * De quem e o dia mostrado. Sem `reports:team`, sempre o proprio. Com ela, o
 * membro pedido; pedido que nao e membro e invalido (404 na API).
 */
export async function resolveReportSubject(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  requested: string | null | undefined
}): Promise<{ subjectId: string; members: DashboardMember[] | null; invalid: boolean }> {
  if (!hasPermission(input.role, "reports:team")) {
    return { subjectId: input.userId, members: null, invalid: false }
  }
  const members = await getDashboardMembers(input.organizationId)
  if (!input.requested) return { subjectId: input.userId, members, invalid: false }
  const valid = members.some((member) => member.userId === input.requested)
  return { subjectId: valid ? input.requested : input.userId, members, invalid: !valid }
}
