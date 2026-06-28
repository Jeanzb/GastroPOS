import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { TenancyService } from '@/services/tenancy';

export function useBranches() {
  return useQuery({
    queryKey: [QUERY_KEYS.branches],
    queryFn: () => TenancyService.listBranches(),
  });
}
