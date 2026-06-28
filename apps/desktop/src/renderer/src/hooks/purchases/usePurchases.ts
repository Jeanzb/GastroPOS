import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE, QUERY_KEYS } from '@/constants';
import { useActiveBranch } from '@/hooks/tenancy';
import { PurchaseService } from '@/services/purchases';
import type { CreatePurchasePayload, PurchaseListParams } from '@/types/purchases';

export function usePurchases() {
  const queryClient = useQueryClient();
  const activeBranch = useActiveBranch();
  const activeBranchId = activeBranch?.id;
  const [params, setParams] = useState<PurchaseListParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const listQuery = useQuery({
    queryKey: [QUERY_KEYS.purchases, params, activeBranchId],
    queryFn: () =>
      PurchaseService.getPurchases({
        ...params,
        branchId: params.branchId ?? activeBranchId,
      }),
  });

  const periodsQuery = useQuery({
    queryKey: [QUERY_KEYS.purchasePeriods, activeBranchId],
    queryFn: () => PurchaseService.getPeriods(activeBranchId),
  });

  const setPeriod = (period: string) =>
    setParams((prev) => ({ ...prev, period, page: 1 }));

  const onMutationSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.purchases] });
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.purchasePeriods] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreatePurchasePayload) =>
      PurchaseService.createPurchase({
        ...payload,
        branchId: payload.branchId ?? activeBranchId,
      }),
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
