import { apiClient, type QueryParams } from '@/api';
import type {
  CategoryListParams,
  CreateCategoryPayload,
  PaginatedResult,
  ProductCategoryDto,
  UpdateCategoryPayload,
} from '@/types/catalog';

export class CategoriesService {
  static getCategories(
    params: CategoryListParams,
  ): Promise<PaginatedResult<ProductCategoryDto>> {
    return apiClient.get<PaginatedResult<ProductCategoryDto>>(
      '/product-categories',
      params as QueryParams,
    );
  }

  static createCategory(
    payload: CreateCategoryPayload,
  ): Promise<ProductCategoryDto> {
    return apiClient.post<ProductCategoryDto>('/product-categories', payload);
  }

  static updateCategory(
    id: string,
    payload: UpdateCategoryPayload,
  ): Promise<ProductCategoryDto> {
    return apiClient.patch<ProductCategoryDto>(
      `/product-categories/${id}`,
      payload,
    );
  }

  static deleteCategory(id: string): Promise<void> {
    return apiClient.delete<void>(`/product-categories/${id}`);
  }
}
