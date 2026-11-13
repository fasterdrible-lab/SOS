import { hasPermission, opportunityScope } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { getCommercialSettings } from "@/lib/settings/commercial"
import { buildNotifications, type HeaderNotifications } from "@/lib/notifications/build"
import { getUnseenQualifiedLeadsCount } from "@/lib/sdr/notifications"
import { dayRange } from "@/lib/time/business-calendar"

const DAY_MS = 24 * 60 * 60 * 1000

/** Mesmos criterios do Meu Dia, apenas contados. */
export async function getHeaderNotifications(input: {
  organizationId: string
  userId: string
  role: string | null | undefined
  /** Equipe de quem consulta; restringe o gestor com equipe (V2-9.2). */
  teamId: string | null
  now?: Date
}): Promise<HeaderNotifications> {
  const { organizationId, userId, role, teamId } = input
  const now = input.now ?? new Date()
  const today = dayRange(now)
  const open = { organizationId, ...opportunityScope(role, userId, teamId), status: "OPEN" as const }

  const { coolingAfterDays } = await getCommercialSettings(organizationId)

  const [hotLeads, overdueTasks, overdueActivities, overdueClose, cooling] = await Promise.all([
    hasPermission(role, "sdr:read") ? getUnseenQualifiedLeadsCount(organizationId) : null,
    prisma.actionTask.count({
      where: {
        actionPlan: { organizationId },
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: today.start },
      },
    }),
    prisma.activity.count({
      where: {
        organizationId,
        ...opportunityScope(role, userId, teamId),
        completedAt: null,
        dueDate: { lt: today.start },
      },
    }),
    prisma.opportunity.count({ where: { ...open, expectedClose: { lt: today.start } } }),
    prisma.opportunity.count({
      where: { ...open, stageChangedAt: { lt: new Date(now.getTime() - coolingAfterDays * DAY_MS) } },
    }),
  ])

  return buildNotifications({ hotLeads, overdueTasks, overdueActivities, overdueClose, cooling })
}
