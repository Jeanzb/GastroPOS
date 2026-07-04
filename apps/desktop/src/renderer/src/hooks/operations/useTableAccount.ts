import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { DiningService } from '@/services/operations';
import type {
  AddTableAccountItemRequest,
  ChargeTableAccountRequest,
  OpenTableAccountRequest,
  TableAccountDto,
  TableAccountItemDto,
  UpdateTableAccountItemRequest,
} from '@/types/dining';

/** Datos minimos del producto para pintar el item antes de que responda la API. */
export interface OptimisticProduct {
  name: string;
  unitPriceAmount: number;
}

interface AccountContext {
  previous: TableAccountDto | undefined;
}

/**
 * Recalcula totales en cliente tras un cambio optimista de items.
 * El impuesto se prorratea con la tasa efectiva actual de la cuenta;
 * el servidor corrige cualquier drift al invalidar en onSettled.
 */
function withItems(account: TableAccountDto, items: TableAccountItemDto[]): TableAccountDto {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxRate = account.subtotal > 0 ? account.taxTotal / account.subtotal : 0;
  const taxTotal = Math.round(subtotal * taxRate);
  const grandTotal = subtotal + taxTotal - account.discountTotal;
  return {
    ...account,
    items,
    subtotal,
    taxTotal,
    grandTotal,
    balanceDue: grandTotal - account.paidTotal,
  };
}

export function useTableAccount(tableId?: string | null) {
  const queryClient = useQueryClient();
  const accountKey = [QUERY_KEYS.tableAccount, tableId];

  const accountQuery = useQuery({
    queryKey: accountKey,
    queryFn: () => DiningService.getCurrentAccount(tableId as string),
    enabled: Boolean(tableId),
  });

  const invalidateAccount = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: accountKey }),
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.diningZones] }),
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cashSession] }),
    ]);
  };

  const beginOptimistic = async (): Promise<AccountContext> => {
    await queryClient.cancelQueries({ queryKey: accountKey });
    return { previous: queryClient.getQueryData<TableAccountDto>(accountKey) };
  };

  const rollback = (_error: unknown, _input: unknown, context?: AccountContext) => {
    if (context?.previous) {
      queryClient.setQueryData(accountKey, context.previous);
    }
  };

  const openAccountMutation = useMutation({
    mutationFn: (payload: OpenTableAccountRequest) =>
      DiningService.openAccount(tableId as string, payload),
    onSuccess: invalidateAccount,
  });

  const addItemMutation = useMutation({
    mutationFn: (input: {
      saleId: string;
      payload: AddTableAccountItemRequest;
      product?: OptimisticProduct;
    }) => DiningService.addAccountItem(input.saleId, input.payload),
    onMutate: async (input) => {
      const context = await beginOptimistic();
      const account = context.previous;
      if (account && account.id === input.saleId) {
        const quantity = input.payload.quantity ?? 1;
        const existing = account.items.find((item) => item.productId === input.payload.productId);
        let items: TableAccountItemDto[];
        if (existing) {
          items = account.items.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  lineTotal: item.unitPriceAmount * (item.quantity + quantity),
                }
              : item,
          );
        } else if (input.product) {
          items = [
            ...account.items,
            {
              id: `optimistic-${input.payload.productId}`,
              productId: input.payload.productId,
              name: input.product.name,
              unitPriceAmount: input.product.unitPriceAmount,
              quantity,
              lineTotal: input.product.unitPriceAmount * quantity,
              createdAt: new Date().toISOString(),
            },
          ];
        } else {
          return context;
        }
        queryClient.setQueryData(accountKey, withItems(account, items));
      }
      return context;
    },
    onError: rollback,
    onSettled: invalidateAccount,
  });

  const updateItemMutation = useMutation({
    mutationFn: (input: {
      saleId: string;
      itemId: string;
      payload: UpdateTableAccountItemRequest;
    }) => DiningService.updateAccountItem(input.saleId, input.itemId, input.payload),
    onMutate: async (input) => {
      const context = await beginOptimistic();
      const account = context.previous;
      if (account && account.id === input.saleId) {
        const items =
          input.payload.quantity <= 0
            ? account.items.filter((item) => item.id !== input.itemId)
            : account.items.map((item) =>
                item.id === input.itemId
                  ? {
                      ...item,
                      quantity: input.payload.quantity,
                      lineTotal: item.unitPriceAmount * input.payload.quantity,
                    }
                  : item,
              );
        queryClient.setQueryData(accountKey, withItems(account, items));
      }
      return context;
    },
    onError: rollback,
    onSettled: invalidateAccount,
  });

  const removeItemMutation = useMutation({
    mutationFn: (input: { saleId: string; itemId: string }) =>
      DiningService.removeAccountItem(input.saleId, input.itemId),
    onMutate: async (input) => {
      const context = await beginOptimistic();
      const account = context.previous;
      if (account && account.id === input.saleId) {
        queryClient.setQueryData(
          accountKey,
          withItems(
            account,
            account.items.filter((item) => item.id !== input.itemId),
          ),
        );
      }
      return context;
    },
    onError: rollback,
    onSettled: invalidateAccount,
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
