-- Tarefa V2-7.1: integracao SALEIA (segredo, reunioes e insights recebidos). Aditiva.

-- CreateEnum
CREATE TYPE "SaleiaInsightKind" AS ENUM ('RECOMMENDATION', 'OBJECTION', 'BUYING_SIGNAL', 'PAIN', 'EVIDENCE', 'STAGE_SUGGESTION');

-- CreateEnum
CREATE TYPE "SaleiaInsightStatus" AS ENUM ('OPEN', 'ACCEPTED', 'DISMISSED');

-- CreateTable
CREATE TABLE "saleia_integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "secretEncrypted" TEXT NOT NULL,
    "secretHint" TEXT NOT NULL,
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saleia_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saleia_meetings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "participants" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "companyId" TEXT,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "analyzedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saleia_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saleia_insights" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "kind" "SaleiaInsightKind" NOT NULL,
    "text" TEXT NOT NULL,
    "quote" TEXT,
    "stageName" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "SaleiaInsightStatus" NOT NULL DEFAULT 'OPEN',
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saleia_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saleia_integrations_organizationId_key" ON "saleia_integrations"("organizationId");

-- CreateIndex
CREATE INDEX "saleia_meetings_organizationId_startedAt_idx" ON "saleia_meetings"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "saleia_meetings_companyId_idx" ON "saleia_meetings"("companyId");

-- CreateIndex
CREATE INDEX "saleia_meetings_opportunityId_idx" ON "saleia_meetings"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "saleia_meetings_organizationId_externalId_key" ON "saleia_meetings"("organizationId", "externalId");

-- CreateIndex
CREATE INDEX "saleia_insights_meetingId_idx" ON "saleia_insights"("meetingId");

-- CreateIndex
CREATE INDEX "saleia_insights_organizationId_kind_status_idx" ON "saleia_insights"("organizationId", "kind", "status");

-- AddForeignKey
ALTER TABLE "saleia_integrations" ADD CONSTRAINT "saleia_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saleia_meetings" ADD CONSTRAINT "saleia_meetings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saleia_meetings" ADD CONSTRAINT "saleia_meetings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saleia_meetings" ADD CONSTRAINT "saleia_meetings_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saleia_meetings" ADD CONSTRAINT "saleia_meetings_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saleia_insights" ADD CONSTRAINT "saleia_insights_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saleia_insights" ADD CONSTRAINT "saleia_insights_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "saleia_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
