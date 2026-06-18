import type { CustomerDto } from '@gastroai/contracts';
import type { Customer } from '../../../generated/prisma';

export function toCustomerDto(customer: Customer): CustomerDto {
  return {
    id: customer.id,
    documentType: customer.documentType,
    documentNumber: customer.documentNumber,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    municipality: customer.municipality,
    taxResponsibility: customer.taxResponsibility,
    isActive: customer.isActive,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}
