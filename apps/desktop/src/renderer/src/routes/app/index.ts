import { createRoute, redirect } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout';
import { ProductsPage } from '@/pages/catalog';
import { useAuthStore } from '@/stores';
import { rootRoute } from '../root';

export const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: () => {
    if (!useAuthStore.getState().accessToken) {
      throw redirect({ to: '/login' });
    }
  },
  component: AppLayout,
});

export const productsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  component: ProductsPage,
});

export const appRoutes = appLayoutRoute.addChildren([productsRoute]);
