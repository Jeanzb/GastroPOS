import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { InventoryService } from '@/services/inventory';
import type { AdjustInventoryStockRequest, CreateInventoryItemRequest } from '@/types/inventory';

export function useInventory() {
  const queryClient = useQueryClient();
  const itemsQuery = useQuery({
    queryKey: [QUERY_KEYS.inventoryItems, { page: 1, pageSize: 100 }],
    queryFn: () => InventoryService.getItems({ page: 1, pageSize: 100 }),
  });
  const categoriesQuery = useQuery({
    queryKey: [QUERY_KEYS.inventoryCategories],
    queryFn: () => InventoryService.getCategories(),
  });

  const onMutationSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventoryItems] });
    void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.stockMovements] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateInventoryItemRequest) => InventoryService.createItem(payload),
    onSuccess: onMutationSuccess,
  });

  const adjustMutation = useMutation({
    mutationFn: (input: { id: string; payload: AdjustInventoryStockRequest }) =>
      InventoryService.adjustStock(input.id, input.payload),
    onSuccess: onMutationSuccess,
  });

  return { itemsQuery, categoriesQuery, createMutation, adjustMutation };
}
