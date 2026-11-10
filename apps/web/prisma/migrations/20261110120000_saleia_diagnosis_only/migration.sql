-- V2-8.2: "So diagnostico". Aditiva: colunas novas nulas ou com padrao.

-- CreateEnum
CREATE TYPE "SaleiaDiagnosisStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CONTESTED');

-- AlterTable
ALTER TABLE "saleia_meetings" ADD COLUMN     "offerPresented" BOOLEAN,
ADD COLUMN     "offerReason" TEXT,
ADD COLUMN     "diagnosisStatus" "SaleiaDiagnosisStatus",
ADD COLUMN     "diagnosisReason" TEXT,
ADD COLUMN     "diagnosisDecidedById" TEXT,
ADD COLUMN     "diagnosisDecidedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "daily_reports" ADD COLUMN     "diagnosisOnly" INTEGER NOT NULL DEFAULT 0;
