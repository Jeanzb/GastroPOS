import { createFileRoute } from '@tanstack/react-router';
import { ReportsPage } from '@/pages/reports';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/reports/': {
      parentRoute: typeof appLayoutRoute;
      id: '/reports';
      path: '/reports';
      fullPath: '/reports';
    };
  }
}

const reportsFileRoute = createFileRoute('/reports/')({
  component: ReportsPage,
});

export const reportsRoute = reportsFileRoute.update({
  path: '/reports',
  getParentRoute: () => appLayoutRoute,
} as never);
