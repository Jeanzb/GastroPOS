import { createFileRoute } from '@tanstack/react-router';
import { TablesPage } from '@/pages/tables';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/tables/': {
      parentRoute: typeof appLayoutRoute;
      id: '/tables';
      path: '/tables';
      fullPath: '/tables';
    };
  }
}

const tablesFileRoute = createFileRoute('/tables/')({
  component: TablesPage,
});

export const tablesRoute = tablesFileRoute.update({
  path: '/tables',
  getParentRoute: () => appLayoutRoute,
} as never);
