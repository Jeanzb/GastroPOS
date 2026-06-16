import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE, QUERY_KEYS } from '@/constants';
import { CategoriesService } from '@/services/catalog';
import type {
  CategoryListParams,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@/types/catalog';

export function useCategories() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CategoryListParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const listQuery = useQuery({
    queryKey: [QUERY_KEYS.categories, params],
    queryFn: () => CategoriesService.getCategories(params),
  });

  const onMutationSuccess = () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.categories] });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCategoryPayload) =>
      CategoriesService.createCategory(payload),
    onSuccess: onMutationSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; payload: UpdateCategoryPayload }) =>
      CategoriesService.updateCategory(input.id, input.payload),
    onSuccess: onMutationSuccess,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CategoriesService.deleteCategory(id),
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
