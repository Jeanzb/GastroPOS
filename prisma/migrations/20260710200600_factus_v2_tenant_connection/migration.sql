-- CreateEnum
CREATE TYPE "FactusEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "FactusConnectionStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING_VERIFICATION', 'READY', 'DEGRADED', 'ERROR');

-- CreateEnum
CREATE TYPE "FiscalOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

-- AlterTable
ALTER TABLE "fiscal_profiles" ADD COLUMN     "countryCode" TEXT NOT NULL DEFAULT 'CO',
ADD COLUMN     "dv" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "municipalityCode" TEXT,
ADD COLUMN     "phone" TEXT;

-- Preserve the recipient country independently from its optional display municipality.
ALTER TABLE "customers" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'CO';

-- CreateTable
CREATE TABLE "factus_connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "environment" "FactusEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "baseUrl" TEXT NOT NULL,
    "encryptedCredentials" TEXT NOT NULL,
    "status" "FactusConnectionStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "lastVerifiedAt" TIMESTAMP(3),
    "lastLatencyMs" INTEGER,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "factus_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_fiscal_configurations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "establishmentName" TEXT,
    "establishmentCode" TEXT,
    "establishmentAddress" TEXT,
    "establishmentMunicipality" TEXT,
    "establishmentPhone" TEXT,
    "invoiceNumberingRangeId" INTEGER,
    "creditNoteNumberingRangeId" INTEGER,
    "supportNumberingRangeId" INTEGER,
    "adjustmentNumberingRangeId" INTEGER,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "branch_fiscal_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_outbox_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "invoiceId" TEXT,
    "documentType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "FiscalOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "factus_connections_tenantId_key" ON "factus_connections"("tenantId");

-- CreateIndex
CREATE INDEX "factus_connections_status_idx" ON "factus_connections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "branch_fiscal_configurations_branchId_key" ON "branch_fiscal_configurations"("branchId");

-- CreateIndex
CREATE INDEX "branch_fiscal_configurations_tenantId_idx" ON "branch_fiscal_configurations"("tenantId");

-- CreateIndex
CREATE INDEX "branch_fiscal_configurations_tenantId_isEnabled_idx" ON "branch_fiscal_configurations"("tenantId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "branch_fiscal_configurations_tenantId_branchId_key" ON "branch_fiscal_configurations"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "fiscal_outbox_events_status_availableAt_idx" ON "fiscal_outbox_events"("status", "availableAt");

-- CreateIndex
CREATE INDEX "fiscal_outbox_events_tenantId_branchId_idx" ON "fiscal_outbox_events"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "fiscal_outbox_events_invoiceId_idx" ON "fiscal_outbox_events"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_outbox_events_tenantId_documentType_idempotencyKey_key" ON "fiscal_outbox_events"("tenantId", "documentType", "idempotencyKey");

-- A sale can only create one primary fiscal invoice. NULL sale ids remain valid for
-- standalone fiscal drafts and provider imports.
CREATE UNIQUE INDEX "invoices_tenantId_saleId_key" ON "invoices"("tenantId", "saleId");

-- AddForeignKey
ALTER TABLE "factus_connections" ADD CONSTRAINT "factus_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_fiscal_configurations" ADD CONSTRAINT "branch_fiscal_configurations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_fiscal_configurations" ADD CONSTRAINT "branch_fiscal_configurations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_outbox_events" ADD CONSTRAINT "fiscal_outbox_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_outbox_events" ADD CONSTRAINT "fiscal_outbox_events_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_outbox_events" ADD CONSTRAINT "fiscal_outbox_events_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
