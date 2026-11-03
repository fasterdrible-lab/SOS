import { hasPermission, opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { COOLING_AFTER_DAYS } from "@/lib/meu-dia/summary"
import { buildNotifications, type HeaderNotifications } from "@/lib/notifications/build"
import { getUnseenQualifiedLeadsCount } from "@/lib/sdr/notifications"
import { dayRange } from "@/lib/time/business-calendar"

const DAY_MS = 24 * 60 * 60 * 1000

/** Mesmos criterios do Meu Dia, apenas contados. */
export async function getHeaderNotifications(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  now?: Date
}): Promise<HeaderNotifications> {
  const { organizationId, userId, role } = input
  const now = input.now ?? new Date()
  const today = dayRange(now)
  const open = { organizationId, ...opportunityScope(role, userId), status: "OPEN" as const }

  const [hotLeads, overdueTasks, overdueClose, cooling] = await Promise.all([
    hasPermission(role, "sdr:read") ? getUnseenQualifiedLeadsCount(organizationId) : null,
    prisma.actionTask.count({
      where: {
        actionPlan: { organizationId },
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: today.start },
      },
    }),
    prisma.opportunity.count({ where: { ...open, expectedClose: { lt: today.start } } }),
    prisma.opportunity.count({
      where: { ...open, stageChangedAt: { lt: new Date(now.getTime() - COOLING_AFTER_DAYS * DAY_MS) } },
    }),
  ])

  return buildNotifications({ hotLeads, overdueTasks, overdueClose, cooling })
}
