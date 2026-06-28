import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { useActiveBranch } from '@/hooks/tenancy';
import { ReportsService } from '@/services/reports';
import type { SalesSummaryQuery } from '@/types/reports';

export function useReports(params: SalesSummaryQuery = {}) {
  const activeBranch = useActiveBranch();
  const scopedParams = { ...params, branchId: params.branchId ?? activeBranch?.id };

  const summaryQuery = useQuery({
    queryKey: [QUERY_KEYS.salesSummary, scopedParams],
    queryFn: () => ReportsService.getSalesSummary(scopedParams),
  });

  return { summaryQuery };
}
