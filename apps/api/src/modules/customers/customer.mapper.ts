import type { CustomerDto } from '@gastroai/contracts';
import type { Customer } from '../../../generated/prisma';

export function toCustomerDto(customer: Customer): CustomerDto {
  return {
    id: customer.id,
    documentType: customer.documentType,
    documentNumber: customer.documentNumber,
    dv: customer.dv,
    factusIdentificationCode: customer.factusIdentificationCode,
    legalOrganizationCode: customer.legalOrganizationCode,
    name: customer.name,
    company: customer.company,
    names: customer.names,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    countryCode: customer.countryCode,
    municipality: customer.municipality,
    municipalityCode: customer.municipalityCode,
    tributeCode: customer.tributeCode,
    taxResponsibility: customer.taxResponsibility,
    taxResponsibilities: customer.taxResponsibilities,
    isActive: customer.isActive,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}
