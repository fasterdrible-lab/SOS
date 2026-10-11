import { Building2 } from "lucide-react"

import { auth } from "@/lib/auth"
import { getConsultantClients } from "@/lib/organizations/client-summary"
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

import { ClientAccessButton } from "./client-access-button"
import { NewClientDialog } from "./new-client-dialog"

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  CONSULTANT: "Consultor",
  MEMBER: "Membro",
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})

export default async function ClientesPage() {
  const session = await auth()
  const userId = session?.user?.id
  const activeOrganizationId = session?.user?.organizationId

  const clients = userId ? await getConsultantClients(userId) : []

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/5 bg-background/80 px-6 backdrop-blur">
        <SidebarTrigger className="text-muted-foreground hover:text-white" />
        <Separator orientation="vertical" className="h-4 opacity-20" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            Meus Clientes
          </span>
          <Badge
            variant="outline"
            className="border-[#D4A64F]/30 bg-[#D4A64F]/5 text-[10px] text-[#D4A64F]"
          >
            Consultoria
          </Badge>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Meus Clientes
              </h1>
              <p className="text-sm text-muted-foreground">
                Organizacoes que voce gerencia como consultor.
              </p>
            </div>
            <NewClientDialog />
          </div>

          <Card className="border-white/5 bg-card">
            <CardContent className="p-0">
              {clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4A64F]/10">
                    <Building2 className="h-7 w-7 text-[#D4A64F]" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    Nenhum cliente ainda
                  </h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Crie sua primeira organizacao-cliente para comecar a
                    acompanhar diagnostico, pipeline e plano de acao.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">
                        Cliente
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Papel
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Maturidade
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Pipeline
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Plano de acao
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground">
                        Acesso
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => {
                      const isActive =
                        client.organizationId === activeOrganizationId

                      return (
                        <TableRow
                          key={client.organizationId}
                          className="border-white/5"
                        >
                          <TableCell className="font-medium text-white">
                            {client.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {ROLE_LABELS[client.role] ?? client.role}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {client.maturityScore === null
                              ? "Sem diagnostico"
                              : `${client.maturityScore}/100`}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {currencyFormatter.format(client.pipelineTotal)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {client.tasksTotal === 0
                              ? "Sem plano de acao"
                              : `${client.tasksDone}/${client.tasksTotal} tarefas`}
                          </TableCell>
                          <TableCell className="text-right">
                            {isActive ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                              >
                                Ativa
                              </Badge>
                            ) : (
                              <ClientAccessButton
                                organizationId={client.organizationId}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
