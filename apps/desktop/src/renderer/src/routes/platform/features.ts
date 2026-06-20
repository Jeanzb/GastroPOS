import { createFileRoute, redirect } from '@tanstack/react-router';
import { PlatformFeaturesPage } from '@/pages/platform';
import { usePlatformAuthStore } from '@/stores';
import { rootRoute } from '../root';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/platform/features/': {
      parentRoute: typeof rootRoute;
      id: '/platform/features';
      path: '/platform/features';
      fullPath: '/platform/features';
    };
  }
}

const platformFeaturesFileRoute = createFileRoute('/platform/features/')({
  beforeLoad: () => {
    if (!usePlatformAuthStore.getState().accessToken) {
      throw redirect({ to: '/platform/login' });
    }
  },
  component: PlatformFeaturesPage,
});

export const platformFeaturesRoute = platformFeaturesFileRoute.update({
  path: '/platform/features',
  getParentRoute: () => rootRoute,
} as never);
