import { createFileRoute, redirect } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout';
import { useAuthStore } from '@/stores';
import { rootRoute } from '../root';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/_app': {
      parentRoute: typeof rootRoute;
      id: 'app';
      path: '';
      fullPath: '';
    };
  }
}

const appLayoutFileRoute = createFileRoute('/_app')({
  beforeLoad: () => {
    if (!useAuthStore.getState().accessToken) {
      throw redirect({ to: '/login' });
    }
  },
  component: AppLayout,
});

export const appLayoutRoute = appLayoutFileRoute.update({
  id: 'app',
  getParentRoute: () => rootRoute,
} as never);
