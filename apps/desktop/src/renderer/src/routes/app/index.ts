import { branchRoute } from '../branches';
import { cashRoute } from '../cash';
import { catalogRoute } from '../catalog';
import { customersRoute } from '../customers';
import { dashboardRoute } from '../dashboard';
import { employeesRoute } from '../employees';
import { floorRoute } from '../floor';
import { fiscalRoute } from '../fiscal';
import { inventoryRoute } from '../inventory';
import { onboardingRoute } from '../onboarding';
import { posRoute } from '../pos';
import { purchasesRoute } from '../purchases';
import { reportsRoute } from '../reports';
import { tablesRoute } from '../tables';
import { appLayoutRoute } from './layout';

export const appRoutes = appLayoutRoute.addChildren([
  dashboardRoute,
  catalogRoute,
  tablesRoute,
  posRoute,
  cashRoute,
  inventoryRoute,
  customersRoute,
  purchasesRoute,
  employeesRoute,
  reportsRoute,
  fiscalRoute,
  floorRoute,
  onboardingRoute,
]);

export const rootFeatureRoutes = [branchRoute, appRoutes];
