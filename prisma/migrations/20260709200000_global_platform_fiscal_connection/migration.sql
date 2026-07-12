-- Remove the legacy generic provider table before introducing the tenant-scoped
-- Factus connection model. Tenant credentials must never become platform-global.
DROP TABLE "fiscal_provider_configs";

DROP TYPE "FiscalEnvironment";
DROP TYPE "FiscalProviderStatus";
