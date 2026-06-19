import { createFileRoute } from '@tanstack/react-router';
import { FloorPage } from '@/pages/floor';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/floor/': {
      parentRoute: typeof appLayoutRoute;
      id: '/floor';
      path: '/floor';
      fullPath: '/floor';
    };
  }
}

const floorFileRoute = createFileRoute('/floor/')({
  component: FloorPage,
});

export const floorRoute = floorFileRoute.update({
  path: '/floor',
  getParentRoute: () => appLayoutRoute,
} as never);
