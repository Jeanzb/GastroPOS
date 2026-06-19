import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { ReportsService } from '@/services/reports';
import type { SalesSummaryQuery } from '@/types/reports';

export function useReports(params: SalesSummaryQuery = {}) {
  const summaryQuery = useQuery({
    queryKey: [QUERY_KEYS.salesSummary, params],
    queryFn: () => ReportsService.getSalesSummary(params),
  });

  return { summaryQuery };
}
