import { platformApiClient } from '@/api';
import type {
  CreatePlatformTenantRequest,
  PlatformAuthResponse,
  PlatformLoginRequest,
  PlatformOverviewDto,
  PlatformTenantDetailDto,
  PlatformTenantDto,
  PlanDto,
  UpdateTenantPlanRequest,
  UpdateTenantStatusRequest,
} from '@gastroai/contracts';

export const PlatformService = {
  login(payload: PlatformLoginRequest) {
    return platformApiClient.request<PlatformAuthResponse>('/platform/auth/login', {
      method: 'POST',
      body: payload,
      auth: false,
    });
  },

  logout() {
    return platformApiClient.post<void>('/platform/auth/logout');
  },

  getOverview() {
    return platformApiClient.get<PlatformOverviewDto>('/platform/overview');
  },

  listTenants() {
    return platformApiClient.get<PlatformTenantDto[]>('/platform/tenants');
  },

  getTenant(id: string) {
    return platformApiClient.get<PlatformTenantDetailDto>(`/platform/tenants/${id}`);
  },

  createTenant(payload: CreatePlatformTenantRequest) {
    return platformApiClient.post<PlatformTenantDetailDto>('/platform/tenants', payload);
  },

  updateTenantStatus(id: string, payload: UpdateTenantStatusRequest) {
    return platformApiClient.patch<PlatformTenantDetailDto>(
      `/platform/tenants/${id}/status`,
      payload,
    );
  },

  updateTenantPlan(id: string, payload: UpdateTenantPlanRequest) {
    return platformApiClient.patch<PlatformTenantDetailDto>(`/platform/tenants/${id}/plan`, payload);
  },

  listPlans() {
    return platformApiClient.get<PlanDto[]>('/platform/plans');
  },
};
