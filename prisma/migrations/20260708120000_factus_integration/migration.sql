-- AlterEnum
ALTER TYPE "FiscalInvoiceEventType" ADD VALUE 'PENDING_VALIDATION';
ALTER TYPE "FiscalInvoiceEventType" ADD VALUE 'SENT_TO_PROVIDER';
ALTER TYPE "FiscalInvoiceEventType" ADD VALUE 'ACCEPTED_BY_DIAN';
ALTER TYPE "FiscalInvoiceEventType" ADD VALUE 'REJECTED_BY_DIAN';
ALTER TYPE "FiscalInvoiceEventType" ADD VALUE 'ARTIFACTS_DOWNLOADED';

-- AlterEnum
ALTER TYPE "FiscalInvoiceStatus" ADD VALUE 'PENDING_VALIDATION';
ALTER TYPE "FiscalInvoiceStatus" ADD VALUE 'SENT_TO_PROVIDER';
ALTER TYPE "FiscalInvoiceStatus" ADD VALUE 'ACCEPTED_BY_DIAN';
ALTER TYPE "FiscalInvoiceStatus" ADD VALUE 'REJECTED_BY_DIAN';
ALTER TYPE "FiscalInvoiceStatus" ADD VALUE 'CANCELLED_BEFORE_ISSUE';
ALTER TYPE "FiscalInvoiceStatus" ADD VALUE 'CORRECTED_WITH_CREDIT_NOTE';
ALTER TYPE "FiscalInvoiceStatus" ADD VALUE 'PARTIALLY_REFUNDED';
ALTER TYPE "FiscalInvoiceStatus" ADD VALUE 'FULLY_REFUNDED';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN "company" TEXT,
ADD COLUMN "dv" TEXT,
ADD COLUMN "factusIdentificationCode" TEXT,
ADD COLUMN "legalOrganizationCode" TEXT,
ADD COLUMN "municipalityCode" TEXT,
ADD COLUMN "names" TEXT,
ADD COLUMN "taxResponsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "tributeCode" TEXT;

-- AlterTable
ALTER TABLE "fiscal_profiles" ADD COLUMN "numberingRangeId" INTEGER;

-- AlterTable
ALTER TABLE "invoice_lines" ADD COLUMN "codeReference" TEXT,
ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "standardCode" TEXT NOT NULL DEFAULT '999',
ADD COLUMN "taxableAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "unitMeasureCode" TEXT NOT NULL DEFAULT '94';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "attachedDocumentXmlBase64" TEXT,
ADD COLUMN "attachedDocumentXmlFileName" TEXT,
ADD COLUMN "factusId" TEXT,
ADD COLUMN "factusNumber" TEXT,
ADD COLUMN "isValidated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastErrorCode" TEXT,
ADD COLUMN "nextRetryAt" TIMESTAMP(3),
ADD COLUMN "numberingRangeId" INTEGER,
ADD COLUMN "pdfBase64" TEXT,
ADD COLUMN "pdfFileName" TEXT,
ADD COLUMN "publicUrl" TEXT,
ADD COLUMN "referenceCode" TEXT,
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "validatedAt" TIMESTAMP(3),
ADD COLUMN "xmlBase64" TEXT,
ADD COLUMN "xmlFileName" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "acquirerReference" TEXT,
ADD COLUMN "dueDate" TIMESTAMP(3),
ADD COLUMN "factusPaymentMethodCode" TEXT,
ADD COLUMN "paymentForm" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "reconciledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN "fiscalCodeReference" TEXT,
ADD COLUMN "fiscalName" TEXT,
ADD COLUMN "incApplies" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isExcluded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "standardCode" TEXT NOT NULL DEFAULT '999',
ADD COLUMN "taxCategoryId" TEXT,
ADD COLUMN "unitMeasureCode" TEXT NOT NULL DEFAULT '94';

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "fiscalDocumentId" TEXT,
ADD COLUMN "fiscalStatus" "FiscalInvoiceStatus",
ADD COLUMN "roundingAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tipAmount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "tax_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "factusTaxCode" TEXT NOT NULL,
    "rateBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "isVat" BOOLEAN NOT NULL DEFAULT false,
    "isInc" BOOLEAN NOT NULL DEFAULT false,
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "tax_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dian_responses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "httpStatus" INTEGER,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "providerTraceId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dian_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "originalInvoiceId" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "correctionConceptCode" TEXT NOT NULL,
    "customizationId" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "status" "FiscalInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "factusNumber" TEXT,
    "factusId" TEXT,
    "cude" TEXT,
    "qrUrl" TEXT,
    "publicUrl" TEXT,
    "pdfBase64" TEXT,
    "pdfFileName" TEXT,
    "xmlBase64" TEXT,
    "xmlFileName" TEXT,
    "providerPayload" JSONB,
    "rejectionPayload" JSONB,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debit_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "originalInvoiceId" TEXT,
    "referenceCode" TEXT NOT NULL,
    "correctionConceptCode" TEXT,
    "customizationId" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "status" "FiscalInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "factusNumber" TEXT,
    "factusId" TEXT,
    "cude" TEXT,
    "qrUrl" TEXT,
    "publicUrl" TEXT,
    "providerPayload" JSONB,
    "rejectionPayload" JSONB,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "featureFlagEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "debit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "debitAccount" TEXT NOT NULL,
    "creditAccount" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "taxCode" TEXT,
    "postedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "accounting_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_categories_tenantId_idx" ON "tax_categories"("tenantId");

-- CreateIndex
CREATE INDEX "tax_categories_tenantId_factusTaxCode_idx" ON "tax_categories"("tenantId", "factusTaxCode");

-- CreateIndex
CREATE UNIQUE INDEX "tax_categories_tenantId_code_key" ON "tax_categories"("tenantId", "code");

-- CreateIndex
CREATE INDEX "dian_responses_tenantId_idx" ON "dian_responses"("tenantId");

-- CreateIndex
CREATE INDEX "dian_responses_invoiceId_idx" ON "dian_responses"("invoiceId");

-- CreateIndex
CREATE INDEX "dian_responses_tenantId_createdAt_idx" ON "dian_responses"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "credit_notes_tenantId_idx" ON "credit_notes"("tenantId");

-- CreateIndex
CREATE INDEX "credit_notes_tenantId_status_idx" ON "credit_notes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "credit_notes_originalInvoiceId_idx" ON "credit_notes"("originalInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_tenantId_referenceCode_key" ON "credit_notes"("tenantId", "referenceCode");

-- CreateIndex
CREATE INDEX "debit_notes_tenantId_idx" ON "debit_notes"("tenantId");

-- CreateIndex
CREATE INDEX "debit_notes_tenantId_status_idx" ON "debit_notes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "debit_notes_originalInvoiceId_idx" ON "debit_notes"("originalInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "debit_notes_tenantId_referenceCode_key" ON "debit_notes"("tenantId", "referenceCode");

-- CreateIndex
CREATE INDEX "accounting_entries_tenantId_idx" ON "accounting_entries"("tenantId");

-- CreateIndex
CREATE INDEX "accounting_entries_tenantId_branchId_idx" ON "accounting_entries"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "accounting_entries_tenantId_sourceType_sourceId_idx" ON "accounting_entries"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "invoices_tenantId_saleId_idx" ON "invoices"("tenantId", "saleId");

-- CreateIndex
CREATE INDEX "invoices_tenantId_factusNumber_idx" ON "invoices"("tenantId", "factusNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenantId_referenceCode_key" ON "invoices"("tenantId", "referenceCode");

-- CreateIndex
CREATE INDEX "products_tenantId_taxCategoryId_idx" ON "products"("tenantId", "taxCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_fiscalDocumentId_key" ON "sales"("fiscalDocumentId");

-- CreateIndex
CREATE INDEX "sales_tenantId_fiscalStatus_idx" ON "sales"("tenantId", "fiscalStatus");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_taxCategoryId_fkey" FOREIGN KEY ("taxCategoryId") REFERENCES "tax_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_categories" ADD CONSTRAINT "tax_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dian_responses" ADD CONSTRAINT "dian_responses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dian_responses" ADD CONSTRAINT "dian_responses_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_entries" ADD CONSTRAINT "accounting_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_entries" ADD CONSTRAINT "accounting_entries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
