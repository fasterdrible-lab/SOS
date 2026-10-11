import { z } from "zod"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

export const ACTION_TASK_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const

export const ACTION_TASK_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
] as const

export const actionTaskInputSchema = z.object({
  title: z.string().trim().min(2, "Informe o titulo da tarefa.").max(160),
  description: optionalText(2000),
  responsible: optionalText(120),
  dueDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine(
      (value) => value === undefined || !Number.isNaN(Date.parse(value)),
      "Data invalida."
    ),
  priority: z.enum(ACTION_TASK_PRIORITIES).optional().default("MEDIUM"),
})

export type ActionTaskInput = z.infer<typeof actionTaskInputSchema>

export const actionTaskStatusUpdateSchema = z.object({
  status: z.enum(ACTION_TASK_STATUSES),
})
