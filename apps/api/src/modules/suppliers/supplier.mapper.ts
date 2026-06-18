import type { SupplierDto } from '@gastroai/contracts';
import type { Supplier } from '../../../generated/prisma';

export function toSupplierDto(supplier: Supplier): SupplierDto {
  return {
    id: supplier.id,
    name: supplier.name,
    documentNumber: supplier.documentNumber,
    email: supplier.email,
    phone: supplier.phone,
    address: supplier.address,
    isActive: supplier.isActive,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}
