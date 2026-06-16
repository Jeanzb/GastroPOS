import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/pages/dashboard';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/dashboard/': {
      parentRoute: typeof appLayoutRoute;
      id: '/';
      path: '/';
      fullPath: '/';
    };
  }
}

const dashboardFileRoute = createFileRoute('/dashboard/')({
  component: DashboardPage,
});

export const dashboardRoute = dashboardFileRoute.update({
  path: '/',
  getParentRoute: () => appLayoutRoute,
} as never);
