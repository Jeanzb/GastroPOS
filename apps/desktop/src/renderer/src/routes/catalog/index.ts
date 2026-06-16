import { createFileRoute } from '@tanstack/react-router';
import { ProductsPage } from '@/pages/catalog';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/catalog/': {
      parentRoute: typeof appLayoutRoute;
      id: '/catalog';
      path: '/catalog';
      fullPath: '/catalog';
    };
  }
}

const catalogFileRoute = createFileRoute('/catalog/')({
  component: ProductsPage,
});

export const catalogRoute = catalogFileRoute.update({
  path: '/catalog',
  getParentRoute: () => appLayoutRoute,
} as never);
