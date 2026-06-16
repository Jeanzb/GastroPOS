import { createFileRoute, redirect } from '@tanstack/react-router';
import { BranchPage } from '@/pages/branches';
import { useAuthStore } from '@/stores';
import { rootRoute } from '../root';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/branches/': {
      parentRoute: typeof rootRoute;
      id: '/sede';
      path: '/sede';
      fullPath: '/sede';
    };
  }
}

const branchFileRoute = createFileRoute('/branches/')({
  beforeLoad: () => {
    if (!useAuthStore.getState().accessToken) {
      throw redirect({ to: '/login' });
    }
  },
  component: BranchPage,
});

export const branchRoute = branchFileRoute.update({
  path: '/sede',
  getParentRoute: () => rootRoute,
} as never);
