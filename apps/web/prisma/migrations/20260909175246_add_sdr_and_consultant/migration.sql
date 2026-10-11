-- CreateEnum
CREATE TYPE "SdrMessageRole" AS ENUM ('LEAD', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "SdrLeadTemperature" AS ENUM ('COLD', 'WARM', 'HOT');

-- CreateEnum
CREATE TYPE "ConsultantMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "sdr_conversations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadName" TEXT,
    "leadEmail" TEXT,
    "leadPhone" TEXT,
    "classification" "SdrLeadTemperature" NOT NULL DEFAULT 'COLD',
    "consultantSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sdr_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sdr_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "SdrMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sdr_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_conversations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultant_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ConsultantMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultant_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sdr_conversations_organizationId_idx" ON "sdr_conversations"("organizationId");

-- CreateIndex
CREATE INDEX "sdr_messages_conversationId_idx" ON "sdr_messages"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "consultant_conversations_organizationId_key" ON "consultant_conversations"("organizationId");

-- CreateIndex
CREATE INDEX "consultant_messages_conversationId_idx" ON "consultant_messages"("conversationId");

-- AddForeignKey
ALTER TABLE "sdr_conversations" ADD CONSTRAINT "sdr_conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sdr_messages" ADD CONSTRAINT "sdr_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "sdr_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_conversations" ADD CONSTRAINT "consultant_conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_messages" ADD CONSTRAINT "consultant_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "consultant_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
