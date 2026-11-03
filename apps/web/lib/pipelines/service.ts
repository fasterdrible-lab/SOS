import { prisma } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"
import {
  DEFAULT_PIPELINE_NAME,
  DEFAULT_STAGES,
  defaultPipelineId,
  defaultStageId,
} from "@/lib/pipelines/defaults"
import type { StageRef } from "@/lib/opportunities/rules"

type Db = Prisma.TransactionClient | typeof prisma

export interface PipelineSummary {
  id: string
  name: string
  isDefault: boolean
  stages: { id: string; name: string; position: number; probability: number; isProposal: boolean }[]
}

const stageSelect = {
  id: true,
  name: true,
  position: true,
  probability: true,
  isProposal: true,
} as const

/**
 * Garante o funil padrao da organizacao e devolve a primeira etapa ativa dele.
 * Organizacoes criadas antes da V2-4.1 ja o receberam pela migration; as
 * criadas por SQL ou por testes o recebem aqui, na primeira negociacao.
 */
export async function ensureDefaultPipeline(db: Db, organizationId: string): Promise<StageRef> {
  const existing = await db.pipeline.findFirst({
    where: { organizationId, isDefault: true, archivedAt: null },
    select: {
      id: true,
      stages: {
        where: { archivedAt: null },
        orderBy: { position: "asc" },
        take: 1,
        select: { id: true, probability: true },
      },
    },
  })

  if (existing?.stages[0]) {
    return { ...existing.stages[0], pipelineId: existing.id, archived: false }
  }

  const pipelineId = defaultPipelineId(organizationId)
  await db.pipeline.upsert({
    where: { id: pipelineId },
    create: { id: pipelineId, organizationId, name: DEFAULT_PIPELINE_NAME, isDefault: true },
    update: { isDefault: true, archivedAt: null },
  })
  await db.pipelineStage.createMany({
    data: DEFAULT_STAGES.map((stage, index) => ({
      id: defaultStageId(organizationId, index + 1),
      organizationId,
      pipelineId,
      position: index + 1,
      ...stage,
    })),
    skipDuplicates: true,
  })

  const first = await db.pipelineStage.findFirstOrThrow({
    where: { pipelineId, archivedAt: null },
    orderBy: { position: "asc" },
    select: { id: true, probability: true },
  })
  return { ...first, pipelineId, archived: false }
}

/** Funis ativos com as etapas ativas, o padrao primeiro. */
export async function getPipelines(organizationId: string): Promise<PipelineSummary[]> {
  await ensureDefaultPipeline(prisma, organizationId)
  return prisma.pipeline.findMany({
    where: { organizationId, archivedAt: null },
    orderBy: [{ isDefault: "desc" }, { position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      isDefault: true,
      stages: { where: { archivedAt: null }, orderBy: { position: "asc" }, select: stageSelect },
    },
  })
}

/** Etapa da organizacao, para validar um id vindo do cliente. */
export async function findStage(db: Db, organizationId: string, stageId: string): Promise<StageRef | null> {
  const stage = await db.pipelineStage.findFirst({
    where: { id: stageId, organizationId, pipeline: { archivedAt: null } },
    select: { id: true, pipelineId: true, probability: true, archivedAt: true },
  })
  return stage
    ? { id: stage.id, pipelineId: stage.pipelineId, probability: stage.probability, archived: stage.archivedAt !== null }
    : null
}
