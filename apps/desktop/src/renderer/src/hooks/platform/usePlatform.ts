import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { PlatformService } from '@/services/platform';
import type {
  CreatePlatformTenantRequest,
  PlatformLoginRequest,
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
