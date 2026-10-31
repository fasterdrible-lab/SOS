-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "lostAt" TIMESTAMP(3),
ADD COLUMN     "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "wonAt" TIMESTAMP(3),
ALTER COLUMN "value" SET DATA TYPE DECIMAL(14,2);

-- CreateTable
CREATE TABLE "opportunity_stage_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "fromStage" "OpportunityStage",
    "toStage" "OpportunityStage" NOT NULL,
    "changedById" TEXT,
    "lostReason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opportunity_stage_history_opportunityId_changedAt_idx" ON "opportunity_stage_history"("opportunityId", "changedAt");

-- CreateIndex
CREATE INDEX "opportunity_stage_history_organizationId_changedAt_idx" ON "opportunity_stage_history"("organizationId", "changedAt");

-- AddForeignKey
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preenchimento dos registros existentes. Sem historico anterior, a data real
-- de ganho, perda ou ultima mudanca de etapa e desconhecida: usa-se a melhor
-- aproximacao disponivel (updatedAt).
UPDATE "opportunities" SET "wonAt" = "updatedAt" WHERE "stage" = 'CLOSED_WON';
UPDATE "opportunities" SET "lostAt" = "updatedAt" WHERE "stage" = 'CLOSED_LOST';
UPDATE "opportunities"
SET "stageChangedAt" = CASE WHEN "stage" = 'PROSPECTING' THEN "createdAt" ELSE "updatedAt" END;
UPDATE "opportunities" SET "probability" = CASE "stage"
  WHEN 'PROSPECTING' THEN 10
  WHEN 'QUALIFICATION' THEN 25
  WHEN 'PROPOSAL' THEN 50
  WHEN 'NEGOTIATION' THEN 75
  WHEN 'CLOSED_WON' THEN 100
  WHEN 'CLOSED_LOST' THEN 0
END;

-- Historico reconstituido (changedById nulo): criacao em prospeccao e, se a
-- etapa atual for outra, uma unica passagem direta ate ela.
INSERT INTO "opportunity_stage_history" ("id", "organizationId", "opportunityId", "fromStage", "toStage", "changedById", "lostReason", "changedAt")
SELECT 'migr-' || "id" || '-0', "organizationId", "id", NULL, 'PROSPECTING', NULL, NULL, "createdAt"
FROM "opportunities";

INSERT INTO "opportunity_stage_history" ("id", "organizationId", "opportunityId", "fromStage", "toStage", "changedById", "lostReason", "changedAt")
SELECT 'migr-' || "id" || '-1', "organizationId", "id", 'PROSPECTING', "stage", NULL, "lostReason", "updatedAt"
FROM "opportunities"
WHERE "stage" <> 'PROSPECTING';
