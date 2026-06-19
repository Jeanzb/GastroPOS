import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { InventoryService } from '@/services/inventory';

export function useInventory() {
  const itemsQuery = useQuery({
    queryKey: [QUERY_KEYS.inventoryItems, { page: 1, pageSize: 100 }],
    queryFn: () => InventoryService.getItems({ page: 1, pageSize: 100 }),
  });

  const movementsQuery = useQuery({
    queryKey: [QUERY_KEYS.stockMovements, { page: 1, pageSize: 12 }],
    queryFn: () => InventoryService.getMovements({ page: 1, pageSize: 12 }),
  });

  return { itemsQuery, movementsQuery };
}
