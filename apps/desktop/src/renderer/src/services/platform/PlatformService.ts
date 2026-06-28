import { platformApiClient } from '@/api';
import type {
  CreatePlatformBranchRequest,
  CreatePlatformTenantRequest,
  DeletePlatformTenantRequest,
  PlatformAuthResponse,
  PlatformFeatureDto,
  PlatformHealthDto,
  PlatformLoginRequest,
  PlatformOverviewDto,
  PlatformTenantDetailDto,
  PlatformTenantDto,
  PlanDto,
  TenantFeatureOverrideDto,
  UpdateTenantFeatureOverrideRequest,
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

  createBranch(id: string, payload: CreatePlatformBranchRequest) {
    return platformApiClient.post<PlatformTenantDetailDto>(`/platform/tenants/${id}/branches`, payload);
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

  deleteTenant(id: string, payload: DeletePlatformTenantRequest) {
    return platformApiClient.request<void>(`/platform/tenants/${id}`, {
      method: 'DELETE',
      body: payload,
    });
  },

  listPlans() {
    return platformApiClient.get<PlanDto[]>('/platform/plans');
  },

  listFeatures() {
    return platformApiClient.get<PlatformFeatureDto[]>('/platform/features');
  },

  getHealth() {
    return platformApiClient.get<PlatformHealthDto>('/platform/health');
  },

  listTenantFeatures(id: string) {
    return platformApiClient.get<TenantFeatureOverrideDto[]>(`/platform/tenants/${id}/features`);
  },

  updateTenantFeatureOverride(
    id: string,
    featureCode: string,
    payload: UpdateTenantFeatureOverrideRequest,
  ) {
    return platformApiClient.patch<TenantFeatureOverrideDto[]>(
      `/platform/tenants/${id}/features/${featureCode}`,
      payload,
    );
  },

  deleteTenantFeatureOverride(id: string, featureCode: string) {
    return platformApiClient.delete<TenantFeatureOverrideDto[]>(
      `/platform/tenants/${id}/features/${featureCode}`,
    );
  },
};
