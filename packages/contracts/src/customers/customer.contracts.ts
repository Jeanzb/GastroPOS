export type CustomerDocumentType =
  | 'CC'
  | 'NIT'
  | 'CE'
  | 'PP'
  | 'TI'
  | 'NUIP'
  | 'OTHER';

export interface CustomerDto {
  id: string;
  documentType: CustomerDocumentType;
  documentNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  municipality: string | null;
  taxResponsibility: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreateCustomerPayload {
  documentType: CustomerDocumentType;
  documentNumber: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  municipality?: string;
  taxResponsibility?: string;
  isActive?: boolean;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;
