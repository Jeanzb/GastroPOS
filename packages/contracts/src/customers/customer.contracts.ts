export type CustomerDocumentType = 'CC' | 'NIT' | 'CE' | 'PP' | 'TI' | 'NUIP' | 'OTHER';

export interface CustomerDto {
  id: string;
  documentType: CustomerDocumentType;
  documentNumber: string;
  dv: string | null;
  factusIdentificationCode: string | null;
  legalOrganizationCode: string | null;
  name: string;
  company: string | null;
  names: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  countryCode: string;
  municipality: string | null;
  municipalityCode: string | null;
  tributeCode: string | null;
  taxResponsibility: string | null;
  taxResponsibilities: string[];
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
  dv?: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  countryCode?: string;
  municipality?: string;
  municipalityCode?: string;
  tributeCode?: string;
  taxResponsibility?: string;
  isActive?: boolean;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;
