import { createFileRoute, redirect } from '@tanstack/react-router';
import { PlatformIntegrationsPage } from '@/pages/platform';
import { usePlatformAuthStore } from '@/stores';
import { rootRoute } from '../root';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/platform/integrations/': {
      parentRoute: typeof rootRoute;
      id: '/platform/integrations';
      path: '/platform/integrations';
      fullPath: '/platform/integrations';
    };
  }
}

const platformIntegrationsFileRoute = createFileRoute('/platform/integrations/')({
  beforeLoad: () => {
    if (!usePlatformAuthStore.getState().accessToken) {
      throw redirect({ to: '/platform/login' });
    }
  },
  component: PlatformIntegrationsPage,
});

export const platformIntegrationsRoute = platformIntegrationsFileRoute.update({
  path: '/platform/integrations',
  getParentRoute: () => rootRoute,
} as never);
