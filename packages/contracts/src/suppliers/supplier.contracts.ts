export interface SupplierDto {
  id: string;
  name: string;
  documentNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreateSupplierPayload {
  name: string;
  documentNumber?: string;
  documentVerificationDigit?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;
