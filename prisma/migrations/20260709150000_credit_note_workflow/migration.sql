-- CreateEnum
CREATE TYPE "CreditNoteEventType" AS ENUM (
  'CREATED',
  'PENDING_VALIDATION',
  'SENT_TO_PROVIDER',
  'ACCEPTED_BY_DIAN',
  'REJECTED_BY_DIAN',
  'FAILED',
  'RETRY_REQUESTED',
  'ARTIFACTS_DOWNLOADED'
);

-- AlterTable
ALTER TABLE "fiscal_profiles" ADD COLUMN "creditNoteNumberingRangeId" INTEGER;

-- AlterTable
ALTER TABLE "credit_notes"
ADD COLUMN "observation" TEXT,
ADD COLUMN "numberingRangeId" INTEGER,
ADD COLUMN "subtotalAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "taxAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tipAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'COP',
ADD COLUMN "attachedDocumentXmlBase64" TEXT,
ADD COLUMN "attachedDocumentXmlFileName" TEXT,
ADD COLUMN "lastErrorCode" TEXT,
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "nextRetryAt" TIMESTAMP(3),
ADD COLUMN "sentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "credit_note_lines" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "creditNoteId" TEXT NOT NULL,
  "originalInvoiceLineId" TEXT,
  "codeReference" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceAmount" INTEGER NOT NULL,
  "grossUnitPriceAmount" INTEGER,
  "factusPrice" TEXT,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "factusDiscountAmount" TEXT,
  "taxableAmount" INTEGER NOT NULL DEFAULT 0,
  "subtotalAmount" INTEGER NOT NULL,
  "taxAmount" INTEGER NOT NULL DEFAULT 0,
  "totalAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'COP',
  "unitMeasureCode" TEXT NOT NULL DEFAULT '94',
  "standardCode" TEXT NOT NULL DEFAULT '999',
  "factusTaxCode" TEXT NOT NULL DEFAULT '01',
  "taxRateBasisPoints" INTEGER NOT NULL DEFAULT 0,
  "isTaxExcluded" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "credit_note_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_responses" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "creditNoteId" TEXT NOT NULL,
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

  CONSTRAINT "credit_note_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "creditNoteId" TEXT NOT NULL,
  "type" "CreditNoteEventType" NOT NULL,
  "status" "FiscalInvoiceStatus" NOT NULL,
  "message" TEXT,
  "payload" JSONB,
  "providerReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,

  CONSTRAINT "credit_note_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_note_lines_tenantId_idx" ON "credit_note_lines"("tenantId");
CREATE INDEX "credit_note_lines_creditNoteId_idx" ON "credit_note_lines"("creditNoteId");
CREATE INDEX "credit_note_lines_originalInvoiceLineId_idx" ON "credit_note_lines"("originalInvoiceLineId");
CREATE INDEX "credit_note_responses_tenantId_idx" ON "credit_note_responses"("tenantId");
CREATE INDEX "credit_note_responses_creditNoteId_idx" ON "credit_note_responses"("creditNoteId");
CREATE INDEX "credit_note_responses_tenantId_createdAt_idx" ON "credit_note_responses"("tenantId", "createdAt");
CREATE INDEX "credit_note_events_tenantId_idx" ON "credit_note_events"("tenantId");
CREATE INDEX "credit_note_events_creditNoteId_idx" ON "credit_note_events"("creditNoteId");
CREATE INDEX "credit_note_events_tenantId_createdAt_idx" ON "credit_note_events"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "credit_note_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "credit_note_lines_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "credit_note_lines_originalInvoiceLineId_fkey" FOREIGN KEY ("originalInvoiceLineId") REFERENCES "invoice_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "credit_note_responses" ADD CONSTRAINT "credit_note_responses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_note_responses" ADD CONSTRAINT "credit_note_responses_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_note_events" ADD CONSTRAINT "credit_note_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_note_events" ADD CONSTRAINT "credit_note_events_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
