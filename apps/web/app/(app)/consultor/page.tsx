import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { AccessDenied } from "@/components/access-denied"
import { prisma } from "@/lib/db"

import { ConsultantChat } from "./consultant-chat"

export default async function ConsultorPage() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (organizationId && !hasPermission(session?.user?.role, "consultant:use")) {
    return <AccessDenied />
  }

  const [conversation, integration] = organizationId
    ? await Promise.all([
        prisma.consultantConversation.findUnique({
          where: { organizationId },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        }),
        prisma.apiIntegration.findUnique({
          where: { organizationId_provider: { organizationId, provider: "ANTHROPIC" } },
          select: { id: true },
        }),
      ])
    : [null, null]

  const initialMessages = (conversation?.messages ?? []).map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
  }))

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 p-6">
        <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Consultor Digital
            </h1>
            <p className="text-sm text-muted-foreground">
              Converse com a IA sobre esta organizacao. Cada resposta ja leva
              em conta o ultimo diagnostico e os KPIs atuais do CRM.
            </p>
          </div>

          <ConsultantChat
            initialMessages={initialMessages}
            hasIntegration={Boolean(integration)}
          />
        </div>
      </main>
    </div>
  )
}
