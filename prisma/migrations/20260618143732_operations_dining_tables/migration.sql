-- CreateEnum
CREATE TYPE "DiningTableStatus" AS ENUM ('FREE', 'OCCUPIED', 'PENDING_BILL', 'RESERVED');

-- CreateTable
CREATE TABLE "dining_zones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "dining_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dining_tables" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 4,
    "status" "DiningTableStatus" NOT NULL DEFAULT 'FREE',
    "waiterName" TEXT,
    "openedAt" TIMESTAMP(3),
    "reservationName" TEXT,
    "reservationTime" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "dining_tables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dining_zones_tenantId_idx" ON "dining_zones"("tenantId");

-- CreateIndex
CREATE INDEX "dining_zones_tenantId_branchId_idx" ON "dining_zones"("tenantId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "dining_zones_tenantId_branchId_name_key" ON "dining_zones"("tenantId", "branchId", "name");

-- CreateIndex
CREATE INDEX "dining_tables_tenantId_idx" ON "dining_tables"("tenantId");

-- CreateIndex
CREATE INDEX "dining_tables_tenantId_branchId_idx" ON "dining_tables"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "dining_tables_zoneId_idx" ON "dining_tables"("zoneId");

-- CreateIndex
CREATE INDEX "dining_tables_tenantId_branchId_status_idx" ON "dining_tables"("tenantId", "branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "dining_tables_tenantId_branchId_number_key" ON "dining_tables"("tenantId", "branchId", "number");

-- AddForeignKey
ALTER TABLE "dining_zones" ADD CONSTRAINT "dining_zones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_zones" ADD CONSTRAINT "dining_zones_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "dining_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
