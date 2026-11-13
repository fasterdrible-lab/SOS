-- V2-9.3: configuracoes comerciais. Aditiva: tabela commercial_settings (uma linha por organizacao).

-- CreateTable
CREATE TABLE "commercial_settings" (
    "organizationId" TEXT NOT NULL,
    "coolingAfterDays" INTEGER NOT NULL DEFAULT 14,
    "holidays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_settings_pkey" PRIMARY KEY ("organizationId")
);

-- AddForeignKey
ALTER TABLE "commercial_settings" ADD CONSTRAINT "commercial_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
