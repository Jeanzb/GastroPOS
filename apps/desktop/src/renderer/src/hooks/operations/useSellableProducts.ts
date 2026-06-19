import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { ProductsService } from '@/services/catalog';

export function useSellableProducts() {
  return useQuery({
    queryKey: [QUERY_KEYS.products, { isActive: true, page: 1, pageSize: 80 }],
    queryFn: () =>
      ProductsService.getProducts({
        isActive: true,
        page: 1,
        pageSize: 80,
      }),
    select: (result) => result.data.filter((product) => product.isSellable),
  });
}
