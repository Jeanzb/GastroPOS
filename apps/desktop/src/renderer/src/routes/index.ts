import { createHashHistory, createRouter } from '@tanstack/react-router';
import { rootFeatureRoutes } from './app';
import { loginRoute } from './auth';
import { rootRoute } from './root';

const routeTree = rootRoute.addChildren([loginRoute, ...rootFeatureRoutes]);

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
