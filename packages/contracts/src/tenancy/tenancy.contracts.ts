export interface TenantDto {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface BranchDto {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
}
