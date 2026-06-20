-- SaaS platform core: cryptographic auth separation, platform users, BASIC plan,
-- tenant lifecycle, and feature flags.

CREATE TYPE "AuthScope" AS ENUM ('TENANT', 'POS', 'PLATFORM');
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'SUPPORT_AGENT');
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'ARCHIVED');

CREATE TABLE "platform_users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" "PlatformRole" NOT NULL DEFAULT 'PLATFORM_ADMIN',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,
  CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_sessions" (
  "id" TEXT NOT NULL,
  "platformUserId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_refresh_tokens" (
  "id" TEXT NOT NULL,
  "platformSessionId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "replacedByTokenId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plans" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "features" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plan_features" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "featureId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_feature_overrides" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "featureId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,
  "updatedById" TEXT,
  CONSTRAINT "tenant_feature_overrides_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tenants"
  ADD COLUMN "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "planId" TEXT,
  ADD COLUMN "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT;

ALTER TABLE "sessions"
  ADD COLUMN "authScope" "AuthScope" NOT NULL DEFAULT 'TENANT';

CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");
CREATE INDEX "platform_users_isActive_idx" ON "platform_users"("isActive");
CREATE INDEX "platform_sessions_platformUserId_idx" ON "platform_sessions"("platformUserId");
CREATE INDEX "platform_sessions_expiresAt_idx" ON "platform_sessions"("expiresAt");
CREATE INDEX "platform_refresh_tokens_platformSessionId_idx" ON "platform_refresh_tokens"("platformSessionId");
CREATE INDEX "platform_refresh_tokens_familyId_idx" ON "platform_refresh_tokens"("familyId");
CREATE INDEX "platform_refresh_tokens_expiresAt_idx" ON "platform_refresh_tokens"("expiresAt");
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");
CREATE INDEX "plans_isActive_idx" ON "plans"("isActive");
CREATE UNIQUE INDEX "features_code_key" ON "features"("code");
CREATE INDEX "features_isActive_idx" ON "features"("isActive");
CREATE UNIQUE INDEX "plan_features_planId_featureId_key" ON "plan_features"("planId", "featureId");
CREATE INDEX "plan_features_featureId_idx" ON "plan_features"("featureId");
CREATE UNIQUE INDEX "tenant_feature_overrides_tenantId_featureId_key" ON "tenant_feature_overrides"("tenantId", "featureId");
CREATE INDEX "tenant_feature_overrides_featureId_idx" ON "tenant_feature_overrides"("featureId");
CREATE INDEX "tenants_planId_idx" ON "tenants"("planId");
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

ALTER TABLE "platform_sessions"
  ADD CONSTRAINT "platform_sessions_platformUserId_fkey"
  FOREIGN KEY ("platformUserId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform_refresh_tokens"
  ADD CONSTRAINT "platform_refresh_tokens_platformSessionId_fkey"
  FOREIGN KEY ("platformSessionId") REFERENCES "platform_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenants"
  ADD CONSTRAINT "tenants_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "plan_features"
  ADD CONSTRAINT "plan_features_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "plan_features_featureId_fkey"
  FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_feature_overrides"
  ADD CONSTRAINT "tenant_feature_overrides_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "tenant_feature_overrides_featureId_fkey"
  FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "plans" ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES ('plan_basic', 'BASIC', 'Basic', 'Suscripcion unica con todos los modulos incluidos.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "features" ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES
  ('feature_pos_enabled', 'pos.enabled', 'POS', 'Ventas y punto de venta.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feature_tables_enabled', 'tables.enabled', 'Mesas', 'Operacion de salon y mesas.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feature_cash_enabled', 'cash.enabled', 'Caja', 'Apertura, movimientos y cierre de caja.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feature_inventory_enabled', 'inventory.enabled', 'Inventario', 'Insumos, saldos y Kardex.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feature_purchases_enabled', 'purchases.enabled', 'Compras', 'Compras y proveedores.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feature_employees_enabled', 'employees.enabled', 'Empleados', 'Usuarios, roles y acceso POS.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feature_reports_basic', 'reports.basic', 'Reportes basicos', 'Reportes operativos basicos.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feature_reports_advanced', 'reports.advanced', 'Reportes avanzados', 'Reportes avanzados incluidos en BASIC.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feature_multi_branch_enabled', 'multi_branch.enabled', 'Multi-sede', 'Operacion multi-sede.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feature_dian_enabled', 'dian.enabled', 'DIAN readiness', 'Preparacion para facturacion electronica.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "plan_features" ("id", "planId", "featureId", "enabled", "createdAt", "updatedAt")
SELECT 'plan_basic_' || f."id", p."id", f."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "plans" p
CROSS JOIN "features" f
WHERE p."code" = 'BASIC'
ON CONFLICT ("planId", "featureId") DO NOTHING;

UPDATE "tenants"
SET "planId" = (SELECT "id" FROM "plans" WHERE "code" = 'BASIC')
WHERE "planId" IS NULL;
