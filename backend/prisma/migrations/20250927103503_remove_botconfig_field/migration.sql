/*
  Warnings:

  - You are about to drop the column `businessHoursConfig` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "businessHoursConfig",
ADD COLUMN     "botConfig" JSONB,
ADD COLUMN     "businessHours" JSONB;
