-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "diningTableId" TEXT,
ADD COLUMN     "guestCount" INTEGER,
ADD COLUMN     "requiresInvoice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waiterName" TEXT;

-- CreateIndex
CREATE INDEX "sales_tenantId_diningTableId_status_idx" ON "sales"("tenantId", "diningTableId", "status");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_diningTableId_fkey" FOREIGN KEY ("diningTableId") REFERENCES "dining_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
