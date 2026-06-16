import { createFileRoute } from '@tanstack/react-router';
import { CashPage } from '@/pages/cash';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/cash/': {
      parentRoute: typeof appLayoutRoute;
      id: '/cash';
      path: '/cash';
      fullPath: '/cash';
    };
  }
}

const cashFileRoute = createFileRoute('/cash/')({
  component: CashPage,
});

export const cashRoute = cashFileRoute.update({
  path: '/cash',
  getParentRoute: () => appLayoutRoute,
} as never);
