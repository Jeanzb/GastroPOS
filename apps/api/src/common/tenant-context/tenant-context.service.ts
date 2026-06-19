import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

export interface TenantContext {
  tenantId: string;
  branchId: string | null;
  actorUserId: string;
}

interface TenantContextStore {
  value: TenantContext | null;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContextStore>();

  run<T>(callback: () => T): T {
    return this.storage.run({ value: null }, callback);
  }

  set(context: TenantContext): void {
    const store = this.storage.getStore();
    if (store) {
      store.value = context;
      return;
    }

    this.storage.enterWith({ value: context });
  }

  get(): TenantContext | undefined {
    return this.storage.getStore()?.value ?? undefined;
  }

  requireTenantId(): string {
    const context = this.get();
    if (!context) {
      throw new Error('Tenant context is required but was not set for this request.');
    }
    return context.tenantId;
  }
}
