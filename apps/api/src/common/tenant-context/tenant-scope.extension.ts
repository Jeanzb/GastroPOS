import { Prisma, PrismaClient } from '../../../generated/prisma';
import type { TenantContextService } from './tenant-context.service';

/**
 * Models the Prisma extension auto-scopes by tenant on where-operations and create.
 * NOTE: `findUnique`/`update`/`delete`/`upsert` are NOT auto-scoped here, so services
 * mutating these by id must still verify ownership with a tenant-filtered read first.
 */
export const TENANT_SCOPED_MODELS = new Set<string>([
  'Product',
  'ProductCategory',
  'CashSession',
  'CashMovement',
  'Customer',
  'Supplier',
  'Purchase',
  'PurchaseItem',
  'UnitOfMeasure',
  'InventoryIngredient',
  'InventoryBalance',
  'StockMovement',
  'DiningZone',
  'DiningTable',
]);

/**
 * Tenant-owned models (they carry `tenantId`) that are intentionally NOT auto-scoped
 * by the extension because they are accessed pre-auth or through the raw client with
 * an explicit tenant filter (auth, platform, money path, fiscal, audit).
 * Every model with a `tenantId` column MUST live in this set or in TENANT_SCOPED_MODELS;
 * the architecture spec fails the build otherwise so a new tenant-owned model can never
 * silently ship without a deliberate isolation decision.
 */
export const MANUALLY_SCOPED_MODELS = new Set<string>([
  'AuditLog',
  'Branch',
  'FiscalProfile',
  'FiscalProviderConfig',
  'InventoryCategory',
  'InventorySkuSequence',
  'Invoice',
  'InvoiceEvent',
  'InvoiceLine',
  'InvoiceTax',
  'Payment',
  'ProductRecipe',
  'ProductRecipeIngredient',
  'Sale',
  'SaleItem',
  'Session',
  'TenantFeatureOverride',
  'TenantSettings',
  'User',
]);

const WHERE_OPERATIONS = new Set<string>([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

interface WhereArgs {
  where?: Record<string, unknown>;
}

interface CreateArgs {
  data?: Record<string, unknown>;
}

export function tenantScopeExtension(tenantContext: TenantContextService) {
  return Prisma.defineExtension({
    name: 'tenant-scope',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const tenantId = tenantContext.requireTenantId();

          if (WHERE_OPERATIONS.has(operation)) {
            const whereArgs = (args ?? {}) as WhereArgs;
            return query({
              ...whereArgs,
              where: { ...whereArgs.where, tenantId },
            });
          }

          if (operation === 'create') {
            const createArgs = (args ?? {}) as CreateArgs;
            return query({
              ...createArgs,
              data: { ...createArgs.data, tenantId },
            });
          }

          return query(args);
        },
      },
    },
  });
}

export function applyTenantScope(client: PrismaClient, tenantContext: TenantContextService) {
  return client.$extends(tenantScopeExtension(tenantContext));
}

export type TenantScopedClient = ReturnType<typeof applyTenantScope>;
