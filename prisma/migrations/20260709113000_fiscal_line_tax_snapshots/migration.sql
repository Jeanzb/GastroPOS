-- AlterTable
ALTER TABLE "invoice_lines"
ADD COLUMN "factusDiscountAmount" TEXT,
ADD COLUMN "factusPrice" TEXT,
ADD COLUMN "factusTaxCode" TEXT NOT NULL DEFAULT '01',
ADD COLUMN "grossUnitPriceAmount" INTEGER,
ADD COLUMN "isTaxExcluded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "taxRateBasisPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "invoice_taxes"
ADD COLUMN "factusTaxCode" TEXT NOT NULL DEFAULT '01',
ADD COLUMN "isTaxExcluded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sale_items"
ADD COLUMN "factusTaxCode" TEXT NOT NULL DEFAULT '01',
ADD COLUMN "fiscalCodeReference" TEXT,
ADD COLUMN "fiscalName" TEXT,
ADD COLUMN "isTaxExcluded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "standardCode" TEXT NOT NULL DEFAULT '999',
ADD COLUMN "taxRateBasisPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "unitMeasureCode" TEXT NOT NULL DEFAULT '94';
