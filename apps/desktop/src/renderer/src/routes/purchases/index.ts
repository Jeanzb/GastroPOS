import { createFileRoute } from '@tanstack/react-router';
import { PurchasesPage } from '@/pages/purchases';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/purchases/': {
      parentRoute: typeof appLayoutRoute;
      id: '/purchases';
      path: '/purchases';
      fullPath: '/purchases';
    };
  }
}

const purchasesFileRoute = createFileRoute('/purchases/')({
  component: PurchasesPage,
});

export const purchasesRoute = purchasesFileRoute.update({
  path: '/purchases',
  getParentRoute: () => appLayoutRoute,
} as never);
