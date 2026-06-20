import { createFileRoute, redirect } from '@tanstack/react-router';
import { PlatformTenantDetailPage } from '@/pages/platform';
import { usePlatformAuthStore } from '@/stores';
import { rootRoute } from '../root';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/platform/tenants/$tenantId/': {
      parentRoute: typeof rootRoute;
      id: '/platform/tenants/$tenantId';
      path: '/platform/tenants/$tenantId';
      fullPath: '/platform/tenants/$tenantId';
    };
  }
}

const platformTenantDetailFileRoute = createFileRoute('/platform/tenants/$tenantId/')({
  beforeLoad: () => {
    if (!usePlatformAuthStore.getState().accessToken) {
      throw redirect({ to: '/platform/login' });
    }
  },
  component: PlatformTenantDetailPage,
});

export const platformTenantDetailRoute = platformTenantDetailFileRoute.update({
  path: '/platform/tenants/$tenantId',
  getParentRoute: () => rootRoute,
} as never);
