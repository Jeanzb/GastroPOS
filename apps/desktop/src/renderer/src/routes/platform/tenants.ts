import { createFileRoute, redirect } from '@tanstack/react-router';
import { PlatformTenantsPage } from '@/pages/platform';
import { usePlatformAuthStore } from '@/stores';
import { rootRoute } from '../root';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/platform/tenants/': {
      parentRoute: typeof rootRoute;
      id: '/platform/tenants';
      path: '/platform/tenants';
      fullPath: '/platform/tenants';
    };
  }
}

const platformTenantsFileRoute = createFileRoute('/platform/tenants/')({
  beforeLoad: () => {
    if (!usePlatformAuthStore.getState().accessToken) {
      throw redirect({ to: '/platform/login' });
    }
  },
  component: PlatformTenantsPage,
});

export const platformTenantsRoute = platformTenantsFileRoute.update({
  path: '/platform/tenants',
  getParentRoute: () => rootRoute,
} as never);
