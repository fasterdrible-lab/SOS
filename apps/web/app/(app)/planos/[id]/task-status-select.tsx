"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ACTION_TASK_STATUSES } from "@/lib/validations/action-task"

const STATUS_LABELS: Record<(typeof ACTION_TASK_STATUSES)[number], string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluida",
  CANCELLED: "Cancelada",
}

export function TaskStatusSelect({
  actionPlanId,
  taskId,
  status,
}: {
  actionPlanId: string
  taskId: string
  status: (typeof ACTION_TASK_STATUSES)[number]
}) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  async function handleStatusChange(nextStatus: string) {
    setIsUpdating(true)

    const response = await fetch(
      `/api/action-plans/${actionPlanId}/tasks/${taskId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      }
    )

    setIsUpdating(false)

    if (response.ok) {
      router.refresh()
    }
  }

  return (
    <Select
      value={status}
      onValueChange={(value) => handleStatusChange(value as string)}
      disabled={isUpdating}
    >
      <SelectTrigger size="sm" className="w-40">
        {isUpdating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <SelectValue>
            {(value: (typeof ACTION_TASK_STATUSES)[number]) => STATUS_LABELS[value]}
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        {ACTION_TASK_STATUSES.map((value) => (
          <SelectItem key={value} value={value}>
            {STATUS_LABELS[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
