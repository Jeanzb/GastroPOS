import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { InventoryService } from '@/services/inventory';

export function useInventory() {
  const itemsQuery = useQuery({
    queryKey: [QUERY_KEYS.inventoryItems, { page: 1, pageSize: 100 }],
    queryFn: () => InventoryService.getItems({ page: 1, pageSize: 100 }),
  });

  return { itemsQuery };
}
