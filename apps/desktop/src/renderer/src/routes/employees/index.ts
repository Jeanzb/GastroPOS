import { createFileRoute } from '@tanstack/react-router';
import { EmployeesPage } from '@/pages/employees';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/employees/': {
      parentRoute: typeof appLayoutRoute;
      id: '/employees';
      path: '/employees';
      fullPath: '/employees';
    };
  }
}

const employeesFileRoute = createFileRoute('/employees/')({
  component: EmployeesPage,
});

export const employeesRoute = employeesFileRoute.update({
  path: '/employees',
  getParentRoute: () => appLayoutRoute,
} as never);
