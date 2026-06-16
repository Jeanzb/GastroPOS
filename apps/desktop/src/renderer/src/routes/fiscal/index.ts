import { createFileRoute } from '@tanstack/react-router';
import { FiscalPage } from '@/pages/fiscal';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/fiscal/': {
      parentRoute: typeof appLayoutRoute;
      id: '/fiscal';
      path: '/fiscal';
      fullPath: '/fiscal';
    };
  }
}

const fiscalFileRoute = createFileRoute('/fiscal/')({
  component: FiscalPage,
});

export const fiscalRoute = fiscalFileRoute.update({
  path: '/fiscal',
  getParentRoute: () => appLayoutRoute,
} as never);
