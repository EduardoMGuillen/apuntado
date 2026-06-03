CREATE TABLE "BusinessMonthlyUsage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "aiCallCount" INTEGER NOT NULL DEFAULT 0,
    "alertWarnSent" BOOLEAN NOT NULL DEFAULT false,
    "alertLimitSent" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessMonthlyUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessMonthlyUsage_businessId_periodKey_key" ON "BusinessMonthlyUsage"("businessId", "periodKey");
CREATE INDEX "BusinessMonthlyUsage_periodKey_idx" ON "BusinessMonthlyUsage"("periodKey");

ALTER TABLE "BusinessMonthlyUsage" ADD CONSTRAINT "BusinessMonthlyUsage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
