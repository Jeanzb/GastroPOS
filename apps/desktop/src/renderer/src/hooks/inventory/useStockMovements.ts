import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { OnChangeFn, SortingState } from '@tanstack/react-table';
import { QUERY_KEYS } from '@/constants';
import { InventoryService } from '@/services/inventory';
import type {
  SortDirection,
  StockMovementListParams,
  StockMovementSortBy,
  StockMovementType,
} from '@/types/inventory';

const DEFAULT_PAGE_SIZE = 15;
const DEFAULT_SORT_BY: StockMovementSortBy = 'createdAt';
const DEFAULT_SORT_DIR: SortDirection = 'desc';
const SORTABLE_FIELDS = new Set<StockMovementSortBy>([
  'createdAt',
  'inventoryItemName',
  'type',
  'quantity',
  'stockAfter',
  'totalCost',
]);

function isStockMovementSortBy(value: string): value is StockMovementSortBy {
  return SORTABLE_FIELDS.has(value as StockMovementSortBy);
}

function paramsToSorting(params: StockMovementListParams): SortingState {
  return [
    {
      id: params.sortBy ?? DEFAULT_SORT_BY,
      desc: (params.sortDir ?? DEFAULT_SORT_DIR) === 'desc',
    },
  ];
}

export function useStockMovements() {
  const [params, setParams] = useState<StockMovementListParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: DEFAULT_SORT_BY,
    sortDir: DEFAULT_SORT_DIR,
  });

  const query = useQuery({
    queryKey: [QUERY_KEYS.stockMovements, params],
    queryFn: () => InventoryService.getMovements(params),
    placeholderData: keepPreviousData,
  });

  const setPage = (pageIndex: number) => {
    setParams((prev) => ({ ...prev, page: pageIndex + 1 }));
  };

  const setType = (type?: StockMovementType) => {
    setParams((prev) => ({ ...prev, type, page: 1 }));
  };

  const setSorting: OnChangeFn<SortingState> = (updaterOrValue) => {
    setParams((prev) => {
      const currentSorting = paramsToSorting(prev);
      const nextSorting =
        typeof updaterOrValue === 'function' ? updaterOrValue(currentSorting) : updaterOrValue;
      const nextSort = nextSorting[0];

      if (!nextSort || !isStockMovementSortBy(nextSort.id)) {
        return { ...prev, page: 1, sortBy: DEFAULT_SORT_BY, sortDir: DEFAULT_SORT_DIR };
      }

      return {
        ...prev,
        page: 1,
        sortBy: nextSort.id,
        sortDir: nextSort.desc ? 'desc' : 'asc',
      };
    });
  };

  return { params, query, sorting: paramsToSorting(params), setPage, setType, setSorting };
}
