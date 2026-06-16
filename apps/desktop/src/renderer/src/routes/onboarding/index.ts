import { createFileRoute } from '@tanstack/react-router';
import { OnboardingPage } from '@/pages/onboarding';
import { appLayoutRoute } from '../app/layout';

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/onboarding/': {
      parentRoute: typeof appLayoutRoute;
      id: '/onboarding';
      path: '/onboarding';
      fullPath: '/onboarding';
    };
  }
}

const onboardingFileRoute = createFileRoute('/onboarding/')({
  component: OnboardingPage,
});

export const onboardingRoute = onboardingFileRoute.update({
  path: '/onboarding',
  getParentRoute: () => appLayoutRoute,
} as never);
