import { createFileRoute } from '@tanstack/react-router';
import { CustomersPage } from '@/pages/customers';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/customers/': {
      parentRoute: typeof appLayoutRoute;
      id: '/customers';
      path: '/customers';
      fullPath: '/customers';
    };
  }
}

const customersFileRoute = createFileRoute('/customers/')({
  component: CustomersPage,
});

export const customersRoute = customersFileRoute.update({
  path: '/customers',
  getParentRoute: () => appLayoutRoute,
} as never);
