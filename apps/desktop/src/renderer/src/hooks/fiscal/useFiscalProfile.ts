import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { FiscalService } from '@/services/fiscal';
import type { UpsertFiscalProfilePayload } from '@/types/fiscal';

export function useFiscalProfile() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: [QUERY_KEYS.fiscalProfile],
    queryFn: () => FiscalService.getProfile(),
  });

  const invalidateProfile = () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.fiscalProfile] });

  const upsertMutation = useMutation({
    mutationFn: (payload: UpsertFiscalProfilePayload) => FiscalService.upsertProfile(payload),
    onSuccess: invalidateProfile,
  });

  const testConnectionMutation = useMutation({
    mutationFn: () => FiscalService.testProviderConnection(),
    onSuccess: invalidateProfile,
  });

  return {
    profileQuery,
    upsertMutation,
    testConnectionMutation,
  };
}
