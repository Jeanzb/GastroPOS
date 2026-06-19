-- DropIndex
DROP INDEX "dining_tables_tenantId_branchId_number_key";

-- DropIndex
DROP INDEX "dining_zones_tenantId_branchId_name_key";

-- CreateIndex
CREATE INDEX "dining_tables_tenantId_branchId_number_idx" ON "dining_tables"("tenantId", "branchId", "number");

-- CreateIndex
CREATE INDEX "dining_zones_tenantId_branchId_name_idx" ON "dining_zones"("tenantId", "branchId", "name");
