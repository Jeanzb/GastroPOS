import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { DiningService } from '@/services/operations';
import type {
  AddTableAccountItemRequest,
  ChargeTableAccountRequest,
  OpenTableAccountRequest,
  UpdateTableAccountItemRequest,
} from '@/types/dining';

export function useTableAccount(tableId?: string | null) {
  const queryClient = useQueryClient();

  const accountQuery = useQuery({
    queryKey: [QUERY_KEYS.tableAccount, tableId],
    queryFn: () => DiningService.getCurrentAccount(tableId as string),
    enabled: Boolean(tableId),
  });

  const invalidateAccount = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tableAccount, tableId] }),
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.diningZones] }),
    ]);
  };

  const openAccountMutation = useMutation({
    mutationFn: (payload: OpenTableAccountRequest) =>
      DiningService.openAccount(tableId as string, payload),
    onSuccess: invalidateAccount,
  });

  const addItemMutation = useMutation({
    mutationFn: (input: { saleId: string; payload: AddTableAccountItemRequest }) =>
      DiningService.addAccountItem(input.saleId, input.payload),
    onSuccess: invalidateAccount,
  });

  const updateItemMutation = useMutation({
    mutationFn: (input: {
      saleId: string;
      itemId: string;
      payload: UpdateTableAccountItemRequest;
    }) => DiningService.updateAccountItem(input.saleId, input.itemId, input.payload),
    onSuccess: invalidateAccount,
  });

  const removeItemMutation = useMutation({
    mutationFn: (input: { saleId: string; itemId: string }) =>
      DiningService.removeAccountItem(input.saleId, input.itemId),
    onSuccess: invalidateAccount,
  });

  const commandMutation = useMutation({
    mutationFn: (saleId: string) => DiningService.getCommand(saleId),
  });

  const receiptMutation = useMutation({
    mutationFn: (saleId: string) => DiningService.getReceipt(saleId),
  });

  const chargeMutation = useMutation({
    mutationFn: (input: { saleId: string; payload: ChargeTableAccountRequest }) =>
      DiningService.chargeAccount(input.saleId, input.payload),
    onSuccess: invalidateAccount,
  });

  return {
    accountQuery,
    openAccountMutation,
    addItemMutation,
    updateItemMutation,
    removeItemMutation,
    commandMutation,
    receiptMutation,
    chargeMutation,
  };
}
