import { apiClient, type QueryParams } from '@/api';
import type {
  CreateProductPayload,
  PaginatedResult,
  ProductDto,
  ProductListParams,
  UpdateProductPayload,
} from '@/types/catalog';

export class ProductsService {
  static getProducts(
    params: ProductListParams,
  ): Promise<PaginatedResult<ProductDto>> {
    return apiClient.get<PaginatedResult<ProductDto>>(
      '/products',
      params as QueryParams,
    );
  }

  static createProduct(payload: CreateProductPayload): Promise<ProductDto> {
    return apiClient.post<ProductDto>('/products', payload);
  }

  static updateProduct(
    id: string,
    payload: UpdateProductPayload,
  ): Promise<ProductDto> {
    return apiClient.patch<ProductDto>(`/products/${id}`, payload);
  }

  static deleteProduct(id: string): Promise<void> {
    return apiClient.delete<void>(`/products/${id}`);
  }
}
