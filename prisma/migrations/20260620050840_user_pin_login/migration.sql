-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failedPinAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3),
ADD COLUMN     "pinUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_branchId_isActive_idx" ON "users"("branchId", "isActive");
