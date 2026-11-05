-- Tarefa V2-4.3: campos obrigatorios para entrar em cada etapa. Aditiva: nenhuma etapa exige nada por padrao.

-- AlterTable
ALTER TABLE "pipeline_stages" ADD COLUMN "requiredFields" TEXT[] DEFAULT ARRAY[]::TEXT[];
