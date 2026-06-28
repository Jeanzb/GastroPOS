import type { BranchDto } from '@gastroai/contracts';
import { apiClient } from '@/api';

export class TenancyService {
  static listBranches(): Promise<BranchDto[]> {
    return apiClient.get<BranchDto[]>('/branches');
  }
}
