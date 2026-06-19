import { apiClient, type QueryParams } from '@/api';
import type { SalesSummaryDto, SalesSummaryQuery } from '@/types/reports';

export class ReportsService {
  static getSalesSummary(params: SalesSummaryQuery = {}): Promise<SalesSummaryDto> {
    return apiClient.get<SalesSummaryDto>('/reports/sales-summary', params as QueryParams);
  }
}
