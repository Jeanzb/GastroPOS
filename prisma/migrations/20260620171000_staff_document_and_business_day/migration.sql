-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN     "businessDayStartsAtHour" INTEGER NOT NULL DEFAULT 4;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "documentNumber" TEXT;

-- CreateIndex
CREATE INDEX "users_branchId_documentNumber_idx" ON "users"("branchId", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_documentNumber_key" ON "users"("tenantId", "documentNumber");
