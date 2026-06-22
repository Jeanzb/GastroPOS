-- CreateEnum
CREATE TYPE "UnitDimension" AS ENUM ('MASS', 'VOLUME', 'COUNT');

-- AlterTable
ALTER TABLE "unit_of_measures"
  ADD COLUMN "dimension" "UnitDimension" NOT NULL DEFAULT 'COUNT',
  ADD COLUMN "factor" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- Backfill standard SI units by code
UPDATE "unit_of_measures" SET "dimension" = 'MASS', "factor" = 1 WHERE "code" = 'g';
UPDATE "unit_of_measures" SET "dimension" = 'MASS', "factor" = 1000 WHERE "code" = 'kg';
UPDATE "unit_of_measures" SET "dimension" = 'MASS', "factor" = 453.59237 WHERE "code" = 'lb';
UPDATE "unit_of_measures" SET "dimension" = 'MASS', "factor" = 28.349523 WHERE "code" = 'oz';
UPDATE "unit_of_measures" SET "dimension" = 'VOLUME', "factor" = 1 WHERE "code" = 'ml';
UPDATE "unit_of_measures" SET "dimension" = 'VOLUME', "factor" = 1000 WHERE "code" IN ('L', 'l');
UPDATE "unit_of_measures" SET "dimension" = 'COUNT', "factor" = 1 WHERE "code" IN ('und', 'UND', 'un');
