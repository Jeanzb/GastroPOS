import type { ProductDto } from '@gastroai/contracts';
import type { Product } from '../../../../generated/prisma';

export function toProductDto(product: Product): ProductDto {
  return {
    id: product.id,
    categoryId: product.categoryId,
    sku: product.sku,
    name: product.name,
    description: product.description,
    priceAmount: product.priceAmount,
    currency: product.currency,
    isActive: product.isActive,
    isSellable: product.isSellable,
    isInventoried: product.isInventoried,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
