import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE, QUERY_KEYS } from '@/constants';
import { ProductsService } from '@/services/catalog';
import type {
  CreateProductPayload,
  ProductListParams,
  UpdateProductPayload,
} from '@/types/catalog';

export function useProducts(initialParams?: ProductListParams) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<ProductListParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    ...initialParams,
  });

  const listQuery = useQuery({
    queryKey: [QUERY_KEYS.products, params],
    queryFn: () => ProductsService.getProducts(params),
  });

  const onMutationSuccess = () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.products] });

  const createMutation = useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      ProductsService.createProduct(payload),
    onSuccess: onMutationSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateProductPayload }) =>
      ProductsService.updateProduct(input.id, input.payload),
    onSuccess: onMutationSuccess,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ProductsService.deleteProduct(id),
    onSuccess: onMutationSuccess,
  });

  return {
    params,
    setParams,
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
