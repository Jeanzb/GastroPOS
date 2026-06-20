-- Relational inventory core:
-- - inventory_ingredients stores tenant-level ingredient identity.
-- - inventory_balances stores branch-level stock and cost.
-- - stock_movements points to both the balance and the ingredient.

-- Preflight: every legacy inventory row must be assignable to a branch.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "inventory_items" ii
    WHERE ii."branchId" IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "branches" b
        WHERE b."tenantId" = ii."tenantId"
          AND b."deletedAt" IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'Inventory migration failed: some legacy inventory rows have no branch and the tenant has no active branch.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "stock_movements"
    WHERE "quantity" <= 0
  ) THEN
    RAISE EXCEPTION 'Inventory migration failed: stock movements with quantity <= 0 must be corrected before migrating.';
  END IF;
END $$;

-- Ensure every tenant has a base unit usable for backfilled legacy rows.
INSERT INTO "unit_of_measures" (
  "id",
  "tenantId",
  "code",
  "name",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'unit_und_' || t."id",
  t."id",
  'UND',
  'Unidad',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "tenants" t
ON CONFLICT ("tenantId", "code") DO NOTHING;

CREATE TABLE "inventory_ingredients" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT,
  "baseUnitId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,

  CONSTRAINT "inventory_ingredients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_balances" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "stockOnHand" INTEGER NOT NULL DEFAULT 0,
  "minimumStock" INTEGER NOT NULL DEFAULT 0,
  "averageCost" INTEGER NOT NULL DEFAULT 0,
  "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,

  CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

WITH normalized_inventory AS (
  SELECT
    ii.*,
    COALESCE(
      NULLIF(UPPER(REGEXP_REPLACE(TRIM(ii."sku"), '\s+', '-', 'g')), ''),
      'MIG-' || UPPER(LEFT(ii."id", 8))
    ) AS "baseSku"
  FROM "inventory_items" ii
),
ranked_inventory AS (
  SELECT
    ni.*,
    ROW_NUMBER() OVER (
      PARTITION BY ni."tenantId", ni."baseSku"
      ORDER BY ni."createdAt", ni."id"
    ) AS "skuRank"
  FROM normalized_inventory ni
)
INSERT INTO "inventory_ingredients" (
  "id",
  "tenantId",
  "productId",
  "baseUnitId",
  "name",
  "sku",
  "isActive",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "createdById",
  "updatedById"
)
SELECT
  'ing_' || ri."id",
  ri."tenantId",
  ri."productId",
  COALESCE(
    ri."unitId",
    (
      SELECT u."id"
      FROM "unit_of_measures" u
      WHERE u."tenantId" = ri."tenantId"
        AND u."code" = 'UND'
      LIMIT 1
    )
  ),
  TRIM(ri."name"),
  CASE
    WHEN ri."skuRank" = 1 THEN ri."baseSku"
    ELSE ri."baseSku" || '-' || ri."skuRank"
  END,
  ri."isActive",
  ri."createdAt",
  ri."updatedAt",
  ri."deletedAt",
  ri."createdById",
  ri."updatedById"
FROM ranked_inventory ri;

INSERT INTO "inventory_balances" (
  "id",
  "tenantId",
  "branchId",
  "ingredientId",
  "stockOnHand",
  "minimumStock",
  "averageCost",
  "allowNegativeStock",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "createdById",
  "updatedById"
)
SELECT
  ii."id",
  ii."tenantId",
  COALESCE(
    ii."branchId",
    (
      SELECT b."id"
      FROM "branches" b
      WHERE b."tenantId" = ii."tenantId"
        AND b."deletedAt" IS NULL
      ORDER BY b."createdAt", b."id"
      LIMIT 1
    )
  ),
  'ing_' || ii."id",
  ii."stockOnHand",
  ii."minimumStock",
  ii."averageCost",
  ii."allowNegativeStock",
  ii."createdAt",
  ii."updatedAt",
  ii."deletedAt",
  ii."createdById",
  ii."updatedById"
FROM "inventory_items" ii;

ALTER TABLE "stock_movements" ADD COLUMN "inventoryBalanceId" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "ingredientId" TEXT;

UPDATE "stock_movements" sm
SET
  "inventoryBalanceId" = sm."inventoryItemId",
  "ingredientId" = ib."ingredientId",
  "branchId" = COALESCE(sm."branchId", ib."branchId")
FROM "inventory_balances" ib
WHERE sm."inventoryItemId" = ib."id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "stock_movements"
    WHERE "inventoryBalanceId" IS NULL
       OR "ingredientId" IS NULL
       OR "branchId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Inventory migration failed: some stock movements could not be linked to an inventory balance.';
  END IF;
END $$;

ALTER TABLE "stock_movements" ALTER COLUMN "inventoryBalanceId" SET NOT NULL;
ALTER TABLE "stock_movements" ALTER COLUMN "ingredientId" SET NOT NULL;
ALTER TABLE "stock_movements" ALTER COLUMN "branchId" SET NOT NULL;

DROP INDEX IF EXISTS "stock_movements_inventoryItemId_idx";
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_inventoryItemId_fkey";
ALTER TABLE "stock_movements" DROP COLUMN "inventoryItemId";

CREATE INDEX "inventory_ingredients_tenantId_idx" ON "inventory_ingredients"("tenantId");
CREATE INDEX "inventory_ingredients_tenantId_productId_idx" ON "inventory_ingredients"("tenantId", "productId");
CREATE INDEX "inventory_ingredients_tenantId_isActive_idx" ON "inventory_ingredients"("tenantId", "isActive");
CREATE UNIQUE INDEX "inventory_ingredients_tenantId_sku_key" ON "inventory_ingredients"("tenantId", "sku");

CREATE INDEX "inventory_balances_tenantId_idx" ON "inventory_balances"("tenantId");
CREATE INDEX "inventory_balances_tenantId_branchId_idx" ON "inventory_balances"("tenantId", "branchId");
CREATE INDEX "inventory_balances_ingredientId_idx" ON "inventory_balances"("ingredientId");
CREATE UNIQUE INDEX "inventory_balances_tenantId_branchId_ingredientId_key" ON "inventory_balances"("tenantId", "branchId", "ingredientId");

CREATE INDEX "stock_movements_inventoryBalanceId_idx" ON "stock_movements"("inventoryBalanceId");
CREATE INDEX "stock_movements_ingredientId_idx" ON "stock_movements"("ingredientId");

ALTER TABLE "inventory_ingredients" ADD CONSTRAINT "inventory_ingredients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_ingredients" ADD CONSTRAINT "inventory_ingredients_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_ingredients" ADD CONSTRAINT "inventory_ingredients_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "unit_of_measures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "inventory_ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventoryBalanceId_fkey" FOREIGN KEY ("inventoryBalanceId") REFERENCES "inventory_balances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "inventory_ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_quantity_positive_chk" CHECK ("quantity" > 0);
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_minimum_stock_non_negative_chk" CHECK ("minimumStock" >= 0);
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_average_cost_non_negative_chk" CHECK ("averageCost" >= 0);

DROP TABLE "inventory_items";
