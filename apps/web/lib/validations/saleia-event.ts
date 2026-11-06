import { z } from "zod"

import { INSIGHT_KINDS } from "@/lib/saleia/rules"

/** Tamanho maximo do corpo do evento, em bytes. */
export const MAX_EVENT_BYTES = 256 * 1024

const isoDate = z
  .string()
  .trim()
  .max(40)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Data invalida.")

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null)

const insightSchema = z
  .object({
    kind: z.enum(INSIGHT_KINDS),
    text: z.string().trim().min(1).max(2000),
    quote: optionalText(2000),
    stageName: optionalText(120),
    dueDate: isoDate.nullish().transform((value) => value || null),
  })
  .refine((insight) => insight.kind !== "STAGE_SUGGESTION" || insight.stageName, {
    message: "Etapa sugerida exige stageName.",
    path: ["stageName"],
  })

/** Evento `meeting.analyzed`, versao 1 (docs/INTEGRACAO_SALEIA.md). */
export const saleiaEventSchema = z.object({
  version: z.literal(1),
  event: z.literal("meeting.analyzed"),
  eventId: z.string().trim().min(1).max(100),
  occurredAt: isoDate,
  meeting: z.object({
    externalId: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(200),
    startedAt: isoDate,
    durationMinutes: z.number().int().min(0).max(24 * 60).nullish().transform((value) => value ?? null),
    participants: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(160),
          email: z.string().trim().toLowerCase().email().max(200).nullish().transform((value) => value || null),
        })
      )
      .max(50)
      .default([]),
    summary: z.string().trim().min(1).max(20000),
  }),
  links: z
    .object({
      opportunityId: optionalText(80),
      companyName: optionalText(200),
    })
    .default({ opportunityId: null, companyName: null }),
  insights: z.array(insightSchema).max(50).default([]),
})

export type SaleiaEvent = z.infer<typeof saleiaEventSchema>
