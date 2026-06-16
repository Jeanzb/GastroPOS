import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginPage } from '@/pages/auth';
import { useAuthStore } from '@/stores';
import { rootRoute } from '../root';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/auth/': {
      parentRoute: typeof rootRoute;
      id: '/login';
      path: '/login';
      fullPath: '/login';
    };
  }
}

const loginFileRoute = createFileRoute('/auth/')({
  beforeLoad: () => {
    if (useAuthStore.getState().accessToken) {
      throw redirect({ to: '/sede' });
    }
  },
  component: LoginPage,
});

export const loginRoute = loginFileRoute.update({
  path: '/login',
  getParentRoute: () => rootRoute,
} as never);
