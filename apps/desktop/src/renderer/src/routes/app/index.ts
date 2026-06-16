import { branchRoute } from '../branches';
import { cashRoute } from '../cash';
import { catalogRoute } from '../catalog';
import { dashboardRoute } from '../dashboard';
import { fiscalRoute } from '../fiscal';
import { inventoryRoute } from '../inventory';
import { onboardingRoute } from '../onboarding';
import { posRoute } from '../pos';
import { reportsRoute } from '../reports';
import { appLayoutRoute } from './layout';

export const appRoutes = appLayoutRoute.addChildren([
  dashboardRoute,
  catalogRoute,
  posRoute,
  cashRoute,
  inventoryRoute,
  fiscalRoute,
  reportsRoute,
  onboardingRoute,
]);

export const rootFeatureRoutes = [branchRoute, appRoutes];
