import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE, QUERY_KEYS } from '@/constants';
import { PurchaseService } from '@/services/purchases';
import type { CreatePurchasePayload, PurchaseListParams } from '@/types/purchases';

export function usePurchases() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<PurchaseListParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const listQuery = useQuery({
    queryKey: [QUERY_KEYS.purchases, params],
    queryFn: () => PurchaseService.getPurchases(params),
  });

  const periodsQuery = useQuery({
    queryKey: [QUERY_KEYS.purchasePeriods],
    queryFn: () => PurchaseService.getPeriods(),
  });

  const setPeriod = (period: string) =>
    setParams((prev) => ({ ...prev, period, page: 1 }));

  const onMutationSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.purchases] });
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.purchasePeriods] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreatePurchasePayload) => PurchaseService.createPurchase(payload),
    onSuccess: onMutationSuccess,
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => PurchaseService.receivePurchase(id),
    onSuccess: onMutationSuccess,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => PurchaseService.cancelPurchase(id),
    onSuccess: onMutationSuccess,
  });

  return {
    params,
    setParams,
    setPeriod,
    listQuery,
    periodsQuery,
    createMutation,
    receiveMutation,
    cancelMutation,
  };
}
