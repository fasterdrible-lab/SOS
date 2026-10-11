import { prisma } from "@/lib/db"
import { getExecutiveKpis } from "@/lib/dashboard/kpis"

export interface ClientSummary {
  organizationId: string
  name: string
  role: string
  maturityScore: number | null
  pipelineTotal: number
  tasksDone: number
  tasksTotal: number
}

export async function getConsultantClients(userId: string): Promise<ClientSummary[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  })

  return Promise.all(
    memberships.map(async (membership) => {
      const organizationId = membership.organization.id

      const [kpis, lastDiagnostic, tasksTotal, tasksDone] = await Promise.all([
        getExecutiveKpis(organizationId),
        prisma.diagnostic.findFirst({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          select: { maturityScore: true },
        }),
        prisma.actionTask.count({
          where: { actionPlan: { organizationId } },
        }),
        prisma.actionTask.count({
          where: { actionPlan: { organizationId }, status: "DONE" },
        }),
      ])

      return {
        organizationId,
        name: membership.organization.name,
        role: membership.role,
        maturityScore: lastDiagnostic?.maturityScore ?? null,
        pipelineTotal: kpis.pipelineTotal,
        tasksDone,
        tasksTotal,
      }
    })
  )
}
