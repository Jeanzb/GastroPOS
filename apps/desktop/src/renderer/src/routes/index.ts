import { createHashHistory, createRouter } from '@tanstack/react-router';
import { appRoutes } from './app';
import { loginRoute } from './auth';
import { rootRoute } from './root';

const routeTree = rootRoute.addChildren([loginRoute, appRoutes]);

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
