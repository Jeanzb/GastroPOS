import { createRoute, redirect } from '@tanstack/react-router';
import { LoginPage } from '@/pages/auth';
import { useAuthStore } from '@/stores';
import { rootRoute } from '../root';

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (useAuthStore.getState().accessToken) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});
