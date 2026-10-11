import Link from "next/link"
import { ClipboardList } from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
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

import { ActionPlanFormDialog } from "./action-plan-form-dialog"

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  COMPLETED: "Concluido",
  PAUSED: "Pausado",
}

export default async function PlanosPage() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  const actionPlans = organizationId
    ? await prisma.actionPlan.findMany({
        where: { organizationId },
        include: { _count: { select: { tasks: true } } },
        orderBy: { createdAt: "desc" },
      })
    : []

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/5 bg-background/80 px-6 backdrop-blur">
        <SidebarTrigger className="text-muted-foreground hover:text-white" />
        <Separator orientation="vertical" className="h-4 opacity-20" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            Plano de Acao
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
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Planos de Acao
              </h1>
              <p className="text-sm text-muted-foreground">
                Planos de crescimento da sua organizacao.
              </p>
            </div>
            <ActionPlanFormDialog />
          </div>

          <Card className="border-white/5 bg-card">
            <CardContent className="p-0">
              {actionPlans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4A64F]/10">
                    <ClipboardList className="h-7 w-7 text-[#D4A64F]" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    Nenhum plano de acao cadastrado
                  </h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Crie o primeiro plano para organizar as acoes de
                    crescimento da sua organizacao.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">
                        Titulo
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Objetivo
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Tarefas
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Criado em
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actionPlans.map((plan) => (
                      <TableRow key={plan.id} className="border-white/5">
                        <TableCell className="font-medium text-white">
                          <Link
                            href={`/planos/${plan.id}`}
                            className="hover:text-[#D4A64F]"
                          >
                            {plan.title}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {plan.objective}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-white/10 text-xs text-muted-foreground"
                          >
                            {STATUS_LABELS[plan.status] ?? plan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {plan._count.tasks}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Intl.DateTimeFormat("pt-BR").format(
                            plan.createdAt
                          )}
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
