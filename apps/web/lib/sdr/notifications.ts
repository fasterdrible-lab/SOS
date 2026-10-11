import { prisma } from "@/lib/db"

export async function getUnseenQualifiedLeadsCount(
  organizationId: string
): Promise<number> {
  return prisma.sdrConversation.count({
    where: {
      organizationId,
      classification: "HOT",
      consultantSeenAt: null,
    },
  })
}

export async function markQualifiedLeadsSeen(
  organizationId: string
): Promise<void> {
  await prisma.sdrConversation.updateMany({
    where: {
      organizationId,
      classification: "HOT",
      consultantSeenAt: null,
    },
    data: { consultantSeenAt: new Date() },
  })
}
