import { createFileRoute, redirect } from '@tanstack/react-router';
import { PlatformPlansPage } from '@/pages/platform';
import { usePlatformAuthStore } from '@/stores';
import { rootRoute } from '../root';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/platform/plans/': {
      parentRoute: typeof rootRoute;
      id: '/platform/plans';
      path: '/platform/plans';
      fullPath: '/platform/plans';
    };
  }
}

const platformPlansFileRoute = createFileRoute('/platform/plans/')({
  beforeLoad: () => {
    if (!usePlatformAuthStore.getState().accessToken) {
      throw redirect({ to: '/platform/login' });
    }
  },
  component: PlatformPlansPage,
});

export const platformPlansRoute = platformPlansFileRoute.update({
  path: '/platform/plans',
  getParentRoute: () => rootRoute,
} as never);
