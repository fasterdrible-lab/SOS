import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

import { ConsultantChat } from "./consultant-chat"

export default async function ConsultorPage() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/5 bg-background/80 px-6 backdrop-blur">
        <SidebarTrigger className="text-muted-foreground hover:text-white" />
        <Separator orientation="vertical" className="h-4 opacity-20" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            Consultor Digital
          </span>
          <Badge
            variant="outline"
            className="border-[#D4A64F]/30 bg-[#D4A64F]/5 text-[10px] text-[#D4A64F]"
          >
            Inteligencia
          </Badge>
        </div>
      </header>

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
