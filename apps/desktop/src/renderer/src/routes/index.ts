import { createHashHistory, createRouter } from '@tanstack/react-router';
import { rootFeatureRoutes } from './app';
import { loginRoute } from './auth';
import { platformRoute } from './platform';
import { platformFeaturesRoute } from './platform/features';
import { platformLoginRoute } from './platform/login';
import { platformPlansRoute } from './platform/plans';
import { platformTenantDetailRoute } from './platform/tenant-detail';
import { platformTenantsRoute } from './platform/tenants';
import { rootRoute } from './root';

const routeTree = rootRoute.addChildren([
  loginRoute,
  platformLoginRoute,
  platformRoute,
  platformTenantsRoute,
  platformTenantDetailRoute,
  platformFeaturesRoute,
  platformPlansRoute,
  ...rootFeatureRoutes,
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
