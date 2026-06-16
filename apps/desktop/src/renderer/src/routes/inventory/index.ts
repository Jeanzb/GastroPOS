import { createFileRoute } from '@tanstack/react-router';
import { InventoryPage } from '@/pages/inventory';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/inventory/': {
      parentRoute: typeof appLayoutRoute;
      id: '/inventory';
      path: '/inventory';
      fullPath: '/inventory';
    };
  }
}

const inventoryFileRoute = createFileRoute('/inventory/')({
  component: InventoryPage,
});

export const inventoryRoute = inventoryFileRoute.update({
  path: '/inventory',
  getParentRoute: () => appLayoutRoute,
} as never);
