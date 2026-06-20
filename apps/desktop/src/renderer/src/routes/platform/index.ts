import { createFileRoute, redirect } from '@tanstack/react-router';
import { PlatformOverviewPage } from '@/pages/platform';
import { usePlatformAuthStore } from '@/stores';
import { rootRoute } from '../root';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/platform/': {
      parentRoute: typeof rootRoute;
      id: '/platform';
      path: '/platform';
      fullPath: '/platform';
    };
  }
}

const platformFileRoute = createFileRoute('/platform/')({
  beforeLoad: () => {
    if (!usePlatformAuthStore.getState().accessToken) {
      throw redirect({ to: '/platform/login' });
    }
  },
  component: PlatformOverviewPage,
});

export const platformRoute = platformFileRoute.update({
  path: '/platform',
  getParentRoute: () => rootRoute,
} as never);
