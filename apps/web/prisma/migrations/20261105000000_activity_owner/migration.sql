-- Tarefa V2-6: dono e empresa na atividade. Aditiva: atividades existentes ficam sem dono.

-- AlterTable
ALTER TABLE "activities" ADD COLUMN "companyId" TEXT,
ADD COLUMN "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "activities_organizationId_ownerId_dueDate_idx" ON "activities"("organizationId", "ownerId", "dueDate");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
