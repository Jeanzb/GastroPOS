import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE, QUERY_KEYS } from '@/constants';
import { SupplierService } from '@/services/suppliers';
import type { CreateSupplierPayload, SupplierListParams } from '@/types/suppliers';

export function useSuppliers(initialParams: SupplierListParams = {}) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<SupplierListParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    ...initialParams,
  });

  const listQuery = useQuery({
    queryKey: [QUERY_KEYS.suppliers, params],
    queryFn: () => SupplierService.getSuppliers(params),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSupplierPayload) => SupplierService.createSupplier(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.suppliers] }),
  });

  return {
    params,
    setParams,
    listQuery,
    createMutation,
  };
}
