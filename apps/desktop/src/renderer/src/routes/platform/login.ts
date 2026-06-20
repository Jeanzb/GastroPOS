import { createFileRoute, redirect } from '@tanstack/react-router';
import { PlatformLoginPage } from '@/pages/platform';
import { usePlatformAuthStore } from '@/stores';
import { rootRoute } from '../root';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/platform/login/': {
      parentRoute: typeof rootRoute;
      id: '/platform/login';
      path: '/platform/login';
      fullPath: '/platform/login';
    };
  }
}

const platformLoginFileRoute = createFileRoute('/platform/login/')({
  beforeLoad: () => {
    if (usePlatformAuthStore.getState().accessToken) {
      throw redirect({ to: '/platform' });
    }
  },
  component: PlatformLoginPage,
});

export const platformLoginRoute = platformLoginFileRoute.update({
  path: '/platform/login',
  getParentRoute: () => rootRoute,
} as never);
