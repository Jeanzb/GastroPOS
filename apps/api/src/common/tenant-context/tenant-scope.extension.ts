import { Prisma, PrismaClient } from '../../../generated/prisma';
import type { TenantContextService } from './tenant-context.service';

const TENANT_SCOPED_MODELS = new Set<string>([
  'Product',
  'ProductCategory',
  'CashSession',
  'CashMovement',
  'Customer',
  'Supplier',
  'Purchase',
  'PurchaseItem',
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
