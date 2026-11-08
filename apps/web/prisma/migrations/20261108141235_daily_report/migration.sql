-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "meetingsDone" INTEGER NOT NULL,
    "followUpsDone" INTEGER NOT NULL,
    "advancedDeals" INTEGER NOT NULL,
    "salesCount" INTEGER NOT NULL,
    "salesRevenue" DECIMAL(14,2) NOT NULL,
    "pendingCount" INTEGER NOT NULL,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_reports_organizationId_day_idx" ON "daily_reports"("organizationId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_organizationId_userId_day_key" ON "daily_reports"("organizationId", "userId", "day");

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
