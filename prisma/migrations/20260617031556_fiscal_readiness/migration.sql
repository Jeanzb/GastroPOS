-- CreateEnum
CREATE TYPE "FiscalProviderType" AS ENUM ('DIAN_DIRECT', 'TECHNOLOGY_PROVIDER', 'API_PROVIDER');

-- CreateEnum
CREATE TYPE "FiscalEnvironment" AS ENUM ('TEST', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "FiscalProviderStatus" AS ENUM ('NOT_CONFIGURED', 'CONFIGURED', 'CONNECTION_TESTED', 'ERROR');

-- CreateEnum
CREATE TYPE "FiscalInvoiceStatus" AS ENUM ('DRAFT', 'READY_TO_SEND', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "FiscalInvoiceEventType" AS ENUM ('CREATED', 'READY_TO_SEND', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'FAILED', 'RETRY_REQUESTED', 'CANCELLED', 'PROVIDER_SYNCED');

-- CreateTable
CREATE TABLE "fiscal_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "taxRegime" TEXT,
    "fiscalResponsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "municipality" TEXT,
    "address" TEXT,
    "invoiceResolutionNumber" TEXT,
    "invoiceResolutionPrefix" TEXT,
    "numberingRangeFrom" INTEGER,
    "numberingRangeTo" INTEGER,
    "numberingValidFrom" TIMESTAMP(3),
    "numberingValidUntil" TIMESTAMP(3),
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "fiscal_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_provider_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fiscalProfileId" TEXT NOT NULL,
    "providerType" "FiscalProviderType" NOT NULL,
    "providerName" TEXT,
    "environment" "FiscalEnvironment" NOT NULL DEFAULT 'TEST',
    "status" "FiscalProviderStatus" NOT NULL DEFAULT 'CONFIGURED',
    "endpointUrl" TEXT,
    "softwareId" TEXT,
    "certificateAlias" TEXT,
    "accountId" TEXT,
    "apiKeyRef" TEXT,
    "lastConnectionTestAt" TIMESTAMP(3),
    "lastConnectionError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "fiscal_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "fiscalProfileId" TEXT,
    "saleId" TEXT,
    "documentType" TEXT NOT NULL DEFAULT 'INVOICE',
    "prefix" TEXT,
    "number" INTEGER,
    "status" "FiscalInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "customerDocumentType" TEXT,
    "customerDocumentNumber" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "customerMunicipality" TEXT,
    "subtotalAmount" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "providerType" "FiscalProviderType",
    "providerName" TEXT,
    "externalReference" TEXT,
    "cufe" TEXT,
    "cude" TEXT,
    "qrUrl" TEXT,
    "xmlUrl" TEXT,
    "pdfUrl" TEXT,
    "providerPayload" JSONB,
    "rejectionPayload" JSONB,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceAmount" INTEGER NOT NULL,
    "subtotalAmount" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_taxes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "taxName" TEXT NOT NULL,
    "taxRateBasisPoints" INTEGER NOT NULL,
    "taxableAmount" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" "FiscalInvoiceEventType" NOT NULL,
    "status" "FiscalInvoiceStatus",
    "message" TEXT,
    "payload" JSONB,
    "providerReference" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_profiles_tenantId_key" ON "fiscal_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "fiscal_profiles_tenantId_idx" ON "fiscal_profiles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_provider_configs_fiscalProfileId_key" ON "fiscal_provider_configs"("fiscalProfileId");

-- CreateIndex
CREATE INDEX "fiscal_provider_configs_tenantId_idx" ON "fiscal_provider_configs"("tenantId");

-- CreateIndex
CREATE INDEX "fiscal_provider_configs_tenantId_status_idx" ON "fiscal_provider_configs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");

-- CreateIndex
CREATE INDEX "invoices_tenantId_status_idx" ON "invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "invoices_branchId_idx" ON "invoices"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenantId_prefix_number_key" ON "invoices"("tenantId", "prefix", "number");

-- CreateIndex
CREATE INDEX "invoice_lines_tenantId_idx" ON "invoice_lines"("tenantId");

-- CreateIndex
CREATE INDEX "invoice_lines_invoiceId_idx" ON "invoice_lines"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_taxes_tenantId_idx" ON "invoice_taxes"("tenantId");

-- CreateIndex
CREATE INDEX "invoice_taxes_invoiceId_idx" ON "invoice_taxes"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_events_tenantId_idx" ON "invoice_events"("tenantId");

-- CreateIndex
CREATE INDEX "invoice_events_invoiceId_idx" ON "invoice_events"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_events_tenantId_createdAt_idx" ON "invoice_events"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "fiscal_profiles" ADD CONSTRAINT "fiscal_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_provider_configs" ADD CONSTRAINT "fiscal_provider_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_provider_configs" ADD CONSTRAINT "fiscal_provider_configs_fiscalProfileId_fkey" FOREIGN KEY ("fiscalProfileId") REFERENCES "fiscal_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_fiscalProfileId_fkey" FOREIGN KEY ("fiscalProfileId") REFERENCES "fiscal_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_taxes" ADD CONSTRAINT "invoice_taxes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_events" ADD CONSTRAINT "invoice_events_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
