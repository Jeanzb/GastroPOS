import { createFileRoute } from '@tanstack/react-router';
import { PosPage } from '@/pages/pos';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/pos/': {
      parentRoute: typeof appLayoutRoute;
      id: '/pos';
      path: '/pos';
      fullPath: '/pos';
    };
  }
}

const posFileRoute = createFileRoute('/pos/')({
  component: PosPage,
});

export const posRoute = posFileRoute.update({
  path: '/pos',
  getParentRoute: () => appLayoutRoute,
} as never);
