import type { ProductCategoryDto } from '@gastroai/contracts';
import type { ProductCategory } from '../../../../generated/prisma';

export function toProductCategoryDto(
  category: ProductCategory,
): ProductCategoryDto {
  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
