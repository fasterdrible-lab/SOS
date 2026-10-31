import { notFound } from "next/navigation"

import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ACTION_TASK_PRIORITIES } from "@/lib/validations/action-task"

import { TaskFormDialog } from "./task-form-dialog"
import { TaskStatusSelect } from "./task-status-select"

const PLAN_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  COMPLETED: "Concluido",
  PAUSED: "Pausado",
}

const PRIORITY_LABELS: Record<(typeof ACTION_TASK_PRIORITIES)[number], string> = {
  LOW: "Baixa",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
}

export default async function PlanoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!session?.user?.id || !organizationId) {
    notFound()
  }

  const actionPlan = await prisma.actionPlan.findFirst({
    where: { id, organizationId },
    include: { tasks: { orderBy: { createdAt: "desc" } } },
  })

  if (!actionPlan) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <Card className="border-white/5 bg-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-white">
                    {actionPlan.title}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {actionPlan.objective}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-white/10 text-xs text-muted-foreground"
                >
                  {PLAN_STATUS_LABELS[actionPlan.status] ?? actionPlan.status}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Tarefas</h2>
            {hasPermission(session?.user?.role, "action-plans:write") && (
              <TaskFormDialog actionPlanId={actionPlan.id} />
            )}
          </div>

          <Card className="border-white/5 bg-card">
            <CardContent className="p-0">
              {actionPlan.tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    Nenhuma tarefa cadastrada
                  </h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Adicione a primeira tarefa para comecar a executar este
                    plano.
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
                        Responsavel
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Prioridade
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Prazo
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actionPlan.tasks.map((task) => (
                      <TableRow key={task.id} className="border-white/5">
                        <TableCell className="font-medium text-white">
                          {task.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {task.responsible ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {PRIORITY_LABELS[task.priority]}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {task.dueDate
                            ? new Intl.DateTimeFormat("pt-BR").format(
                                task.dueDate
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <TaskStatusSelect
                            actionPlanId={actionPlan.id}
                            taskId={task.id}
                            status={task.status}
                          />
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
