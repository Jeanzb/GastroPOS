export type {
  PaginatedResult,
  ProductCategoryDto,
  ProductDto,
} from '@gastroai/contracts';

export interface CategoryListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

export interface CreateCategoryPayload {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export interface CreateProductPayload {
  name: string;
  priceAmount: number;
  currency?: string;
  categoryId?: string;
  sku?: string;
  description?: string;
  isActive?: boolean;
  isSellable?: boolean;
  isInventoried?: boolean;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;
