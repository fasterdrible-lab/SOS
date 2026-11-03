-- Tarefa V2-4.1: funis e etapas configuraveis, status separado da etapa.
-- Converte os dados: cada organizacao ganha o funil padrao "Vendas" com as 4
-- etapas abertas antigas; ganha e perdida viram status, e a negociacao fica na
-- ultima etapa aberta em que esteve (Negociacao, se nao houver historico).
-- Remove as colunas e o enum antigos: reverter exige restaurar o backup.

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "pipelines" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "probability" INTEGER NOT NULL,
    "isProposal" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- Funil padrao por organizacao, com ids deterministicos para a conversao abaixo.
INSERT INTO "pipelines" ("id", "organizationId", "name", "position", "isDefault", "updatedAt")
SELECT 'pipe_' || o."id", o."id", 'Vendas', 0, true, CURRENT_TIMESTAMP
FROM "organizations" o;

INSERT INTO "pipeline_stages" ("id", "organizationId", "pipelineId", "name", "position", "probability", "isProposal", "updatedAt")
SELECT 'stg_' || o."id" || '_' || s.position, o."id", 'pipe_' || o."id", s.name, s.position, s.probability, s.position = 3, CURRENT_TIMESTAMP
FROM "organizations" o
CROSS JOIN (VALUES
    (1, 'Prospecção', 10),
    (2, 'Qualificação', 25),
    (3, 'Proposta', 50),
    (4, 'Negociação', 75)
) AS s(position, name, probability);

-- Posicao da etapa antiga no funil padrao; fechadas nao tem etapa propria.
CREATE FUNCTION pg_temp.legacy_position(stage TEXT) RETURNS INTEGER AS $$
    SELECT CASE stage
        WHEN 'PROSPECTING' THEN 1
        WHEN 'QUALIFICATION' THEN 2
        WHEN 'PROPOSAL' THEN 3
        WHEN 'NEGOTIATION' THEN 4
    END
$$ LANGUAGE SQL IMMUTABLE;

CREATE FUNCTION pg_temp.legacy_status(stage TEXT) RETURNS "OpportunityStatus" AS $$
    SELECT CASE stage
        WHEN 'CLOSED_WON' THEN 'WON'::"OpportunityStatus"
        WHEN 'CLOSED_LOST' THEN 'LOST'::"OpportunityStatus"
        ELSE 'OPEN'::"OpportunityStatus"
    END
$$ LANGUAGE SQL IMMUTABLE;

-- Ultima etapa aberta registrada antes de um instante: onde a negociacao estava
-- enquanto fechada.
CREATE FUNCTION pg_temp.open_position_before(opportunity TEXT, instant TIMESTAMP) RETURNS INTEGER AS $$
    SELECT pg_temp.legacy_position(h."toStage"::TEXT)
    FROM "opportunity_stage_history" h
    WHERE h."opportunityId" = opportunity
      AND h."changedAt" < instant
      AND pg_temp.legacy_position(h."toStage"::TEXT) IS NOT NULL
    ORDER BY h."changedAt" DESC
    LIMIT 1
$$ LANGUAGE SQL STABLE;

-- AlterTable: novas colunas, ainda opcionais
ALTER TABLE "opportunities"
ADD COLUMN "pipelineId" TEXT,
ADD COLUMN "stageId" TEXT,
ADD COLUMN "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN';

ALTER TABLE "opportunity_stage_history"
ADD COLUMN "fromStageId" TEXT,
ADD COLUMN "fromStatus" "OpportunityStatus",
ADD COLUMN "toStageId" TEXT,
ADD COLUMN "toStatus" "OpportunityStatus";

-- Negociacoes: fechadas ficam na ultima etapa aberta registrada no historico.
UPDATE "opportunities" o
SET "pipelineId" = 'pipe_' || o."organizationId",
    "status" = pg_temp.legacy_status(o."stage"::TEXT),
    "stageId" = 'stg_' || o."organizationId" || '_' || COALESCE(
        pg_temp.legacy_position(o."stage"::TEXT),
        (
            SELECT pg_temp.legacy_position(h."toStage"::TEXT)
            FROM "opportunity_stage_history" h
            WHERE h."opportunityId" = o."id"
              AND pg_temp.legacy_position(h."toStage"::TEXT) IS NOT NULL
            ORDER BY h."changedAt" DESC
            LIMIT 1
        ),
        4
    );

-- Historico: entrada que fecha fica na etapa de onde veio; reabertura sai da
-- ultima etapa aberta anterior; sem etapa aberta conhecida, Negociacao.
UPDATE "opportunity_stage_history" h
SET "toStatus" = pg_temp.legacy_status(h."toStage"::TEXT),
    "fromStatus" = CASE WHEN h."fromStage" IS NULL THEN NULL ELSE pg_temp.legacy_status(h."fromStage"::TEXT) END,
    "toStageId" = 'stg_' || h."organizationId" || '_' || COALESCE(
        pg_temp.legacy_position(h."toStage"::TEXT),
        pg_temp.legacy_position(h."fromStage"::TEXT),
        pg_temp.open_position_before(h."opportunityId", h."changedAt"),
        4
    ),
    "fromStageId" = CASE WHEN h."fromStage" IS NULL THEN NULL
        ELSE 'stg_' || h."organizationId" || '_' || COALESCE(
            pg_temp.legacy_position(h."fromStage"::TEXT),
            pg_temp.open_position_before(h."opportunityId", h."changedAt"),
            4
        )
    END;

ALTER TABLE "opportunities"
ALTER COLUMN "pipelineId" SET NOT NULL,
ALTER COLUMN "stageId" SET NOT NULL,
DROP COLUMN "stage";

ALTER TABLE "opportunity_stage_history"
ALTER COLUMN "toStageId" SET NOT NULL,
ALTER COLUMN "toStatus" SET NOT NULL,
DROP COLUMN "fromStage",
DROP COLUMN "toStage";

-- DropEnum
DROP TYPE "OpportunityStage";

-- CreateIndex
CREATE INDEX "pipelines_organizationId_idx" ON "pipelines"("organizationId");

-- CreateIndex
CREATE INDEX "pipeline_stages_pipelineId_position_idx" ON "pipeline_stages"("pipelineId", "position");

-- CreateIndex
CREATE INDEX "opportunities_pipelineId_stageId_idx" ON "opportunities"("pipelineId", "stageId");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "pipeline_stages"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "pipeline_stages"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "pipeline_stages"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
