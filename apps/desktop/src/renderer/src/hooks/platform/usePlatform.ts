import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { PlatformService } from '@/services/platform';
import type {
  CreatePlatformBranchRequest,
  CreatePlatformTenantRequest,
  DeletePlatformTenantRequest,
  PlatformLoginRequest,
  UpdateTenantFeatureOverrideRequest,
  UpdateTenantPlanRequest,
  UpdateTenantStatusRequest,
} from '@gastroai/contracts';

export function usePlatformAuth() {
  const loginMutation = useMutation({
    mutationFn: (payload: PlatformLoginRequest) => PlatformService.login(payload),
  });
  const logoutMutation = useMutation({
    mutationFn: () => PlatformService.logout(),
  });

  return { loginMutation, logoutMutation };
}

export function usePlatformOverview() {
  return useQuery({
    queryKey: [QUERY_KEYS.platformOverview],
    queryFn: () => PlatformService.getOverview(),
  });
}

export function usePlatformTenants() {
  return useQuery({
    queryKey: [QUERY_KEYS.platformTenants],
    queryFn: () => PlatformService.listTenants(),
  });
}

export function usePlatformTenant(id: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.platformTenant, id],
    queryFn: () => PlatformService.getTenant(id),
    enabled: Boolean(id),
  });
}

export function usePlatformPlans() {
  return useQuery({
    queryKey: [QUERY_KEYS.platformPlans],
    queryFn: () => PlatformService.listPlans(),
  });
}

export function usePlatformFeatures() {
  return useQuery({
    queryKey: [QUERY_KEYS.platformFeatures],
    queryFn: () => PlatformService.listFeatures(),
  });
}

export function usePlatformHealth() {
  return useQuery({
    queryKey: [QUERY_KEYS.platformHealth],
    queryFn: () => PlatformService.getHealth(),
    refetchInterval: 30_000,
  });
}

export function usePlatformTenantFeatures(id: string | null) {
  return useQuery({
    queryKey: [QUERY_KEYS.platformTenantFeatures, id],
    queryFn: () => PlatformService.listTenantFeatures(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreatePlatformTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePlatformTenantRequest) => PlatformService.createTenant(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformTenants] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformOverview] });
    },
  });
}

export function useCreatePlatformBranch(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePlatformBranchRequest) => PlatformService.createBranch(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformTenant, id] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformTenants] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformOverview] });
    },
  });
}

export function useUpdateTenantStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTenantStatusRequest) => PlatformService.updateTenantStatus(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformTenants] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformTenant, id] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformOverview] });
    },
  });
}

export function useUpdateTenantPlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTenantPlanRequest) => PlatformService.updateTenantPlan(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformTenants] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformTenant, id] });
    },
  });
}

export function useDeletePlatformTenant(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeletePlatformTenantRequest) => PlatformService.deleteTenant(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformTenants] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformOverview] });
      void queryClient.removeQueries({ queryKey: [QUERY_KEYS.platformTenant, id] });
      void queryClient.removeQueries({ queryKey: [QUERY_KEYS.platformTenantFeatures, id] });
    },
  });
}

export function useUpdateTenantFeatureOverride(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { featureCode: string; payload: UpdateTenantFeatureOverrideRequest }) =>
      PlatformService.updateTenantFeatureOverride(id, input.featureCode, input.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformTenantFeatures, id] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformTenant, id] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformFeatures] });
    },
  });
}

export function useDeleteTenantFeatureOverride(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (featureCode: string) => PlatformService.deleteTenantFeatureOverride(id, featureCode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformTenantFeatures, id] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformTenant, id] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platformFeatures] });
    },
  });
}
