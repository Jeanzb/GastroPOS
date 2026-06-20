CREATE INDEX IF NOT EXISTS "tenants_deletedAt_idx" ON "tenants"("deletedAt");
CREATE INDEX IF NOT EXISTS "tenants_status_deletedAt_idx" ON "tenants"("status", "deletedAt");

CREATE INDEX IF NOT EXISTS "branches_tenantId_deletedAt_idx" ON "branches"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "branches_tenantId_isActive_idx" ON "branches"("tenantId", "isActive");

CREATE INDEX IF NOT EXISTS "sessions_tenantId_branchId_idx" ON "sessions"("tenantId", "branchId");
CREATE INDEX IF NOT EXISTS "sessions_isActive_expiresAt_idx" ON "sessions"("isActive", "expiresAt");

CREATE INDEX IF NOT EXISTS "platform_sessions_platformUserId_isActive_idx" ON "platform_sessions"("platformUserId", "isActive");

CREATE INDEX IF NOT EXISTS "plan_features_planId_idx" ON "plan_features"("planId");
CREATE INDEX IF NOT EXISTS "tenant_feature_overrides_tenantId_idx" ON "tenant_feature_overrides"("tenantId");
