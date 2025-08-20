-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "callsUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "subscriptionPlan" TEXT NOT NULL DEFAULT 'basic',
ADD COLUMN     "usageResetDate" TIMESTAMP(3);
