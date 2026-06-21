CREATE TABLE "inventory_categories" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "skuPrefix" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,
  CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_sku_sequences" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_sku_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_categories_tenantId_code_key" ON "inventory_categories"("tenantId", "code");
CREATE UNIQUE INDEX "inventory_categories_tenantId_skuPrefix_key" ON "inventory_categories"("tenantId", "skuPrefix");
CREATE INDEX "inventory_categories_tenantId_idx" ON "inventory_categories"("tenantId");
CREATE INDEX "inventory_categories_tenantId_isActive_idx" ON "inventory_categories"("tenantId", "isActive");
CREATE INDEX "inventory_categories_tenantId_deletedAt_idx" ON "inventory_categories"("tenantId", "deletedAt");

CREATE UNIQUE INDEX "inventory_sku_sequences_tenantId_prefix_key" ON "inventory_sku_sequences"("tenantId", "prefix");
CREATE INDEX "inventory_sku_sequences_tenantId_idx" ON "inventory_sku_sequences"("tenantId");

ALTER TABLE "inventory_categories"
  ADD CONSTRAINT "inventory_categories_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_sku_sequences"
  ADD CONSTRAINT "inventory_sku_sequences_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

WITH defaults("code", "name", "skuPrefix") AS (
  VALUES
    ('CARNES', 'Carnes', 'CAR'),
    ('BEBIDAS', 'Bebidas', 'BEB'),
    ('COMIDAS_RAPIDAS', 'Comidas Rapidas', 'COM'),
    ('VERDURAS', 'Verduras', 'VER'),
    ('LACTEOS', 'Lacteos', 'LAC'),
    ('GRANOS', 'Granos', 'GRA'),
    ('GENERICO', 'Generico', 'GEN')
)
INSERT INTO "inventory_categories" ("id", "tenantId", "code", "name", "skuPrefix")
SELECT
  'invcat_' || md5(t."id" || ':' || d."code"),
  t."id",
  d."code",
  d."name",
  d."skuPrefix"
FROM "tenants" t
CROSS JOIN defaults d
ON CONFLICT ("tenantId", "code") DO NOTHING;

ALTER TABLE "inventory_ingredients" ADD COLUMN "categoryId" TEXT;

UPDATE "inventory_ingredients" i
SET "categoryId" = c."id"
FROM "inventory_categories" c
WHERE c."tenantId" = i."tenantId"
  AND c."code" = 'GENERICO'
  AND i."categoryId" IS NULL;

ALTER TABLE "inventory_ingredients" ALTER COLUMN "categoryId" SET NOT NULL;

CREATE INDEX "inventory_ingredients_tenantId_categoryId_idx" ON "inventory_ingredients"("tenantId", "categoryId");

ALTER TABLE "inventory_ingredients"
  ADD CONSTRAINT "inventory_ingredients_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "inventory_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

WITH prefixes AS (
  SELECT DISTINCT "tenantId", "skuPrefix" AS "prefix"
  FROM "inventory_categories"
),
numbered AS (
  SELECT
    p."tenantId",
    p."prefix",
    COALESCE(
      MAX(
        CASE
          WHEN i."sku" ~ ('^' || p."prefix" || '-[0-9]{4}$')
          THEN substring(i."sku" from 5 for 4)::INTEGER
          ELSE NULL
        END
      ),
      0
    ) + 1 AS "nextNumber"
  FROM prefixes p
  LEFT JOIN "inventory_ingredients" i
    ON i."tenantId" = p."tenantId"
  GROUP BY p."tenantId", p."prefix"
)
INSERT INTO "inventory_sku_sequences" ("id", "tenantId", "prefix", "nextNumber")
SELECT
  'invseq_' || md5(n."tenantId" || ':' || n."prefix"),
  n."tenantId",
  n."prefix",
  n."nextNumber"
FROM numbered n
ON CONFLICT ("tenantId", "prefix") DO NOTHING;
