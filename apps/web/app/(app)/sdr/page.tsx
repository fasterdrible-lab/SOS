import { Zap } from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { markQualifiedLeadsSeen } from "@/lib/sdr/notifications"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const CLASSIFICATION_LABEL: Record<string, string> = {
  COLD: "Frio",
  WARM: "Morno",
  HOT: "Quente",
}

const CLASSIFICATION_CLASS: Record<string, string> = {
  COLD: "border-white/10 bg-white/5 text-muted-foreground",
  WARM: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  HOT: "border-[#D4A64F]/40 bg-[#D4A64F]/10 text-[#D4A64F]",
}

export default async function SdrConsolePage() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  const conversations = organizationId
    ? await prisma.sdrConversation.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { messages: true } },
        },
      })
    : []

  if (organizationId) {
    await markQualifiedLeadsSeen(organizationId)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/5 bg-background/80 px-6 backdrop-blur">
        <SidebarTrigger className="text-muted-foreground hover:text-white" />
        <Separator orientation="vertical" className="h-4 opacity-20" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">IA SDR</span>
          <Badge
            variant="outline"
            className="border-[#D4A64F]/30 bg-[#D4A64F]/5 text-[10px] text-[#D4A64F]"
          >
            Inteligencia
          </Badge>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Conversas do IA SDR
            </h1>
            <p className="text-sm text-muted-foreground">
              Leads que conversaram com o widget publico e a classificacao
              automatica de cada conversa.
            </p>
          </div>

          <Card className="border-white/5 bg-card">
            <CardContent className="p-0">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4A64F]/10">
                    <Zap className="h-7 w-7 text-[#D4A64F]" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    Nenhuma conversa ainda
                  </h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Compartilhe o link do widget publico para comecar a
                    receber leads via IA SDR.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">
                        Lead
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Classificacao
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Ultima mensagem
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Mensagens
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Atualizada em
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversations.map((conversation) => (
                      <TableRow key={conversation.id} className="border-white/5">
                        <TableCell className="font-medium text-white">
                          {conversation.leadName ?? "Lead sem nome"}
                          <div className="text-xs text-muted-foreground">
                            {conversation.leadEmail ?? conversation.leadPhone ?? "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              CLASSIFICATION_CLASS[conversation.classification]
                            }
                          >
                            {CLASSIFICATION_LABEL[conversation.classification]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {conversation.messages[0]?.content ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {conversation._count.messages}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(conversation.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
