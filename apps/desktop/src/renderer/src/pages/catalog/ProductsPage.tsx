import { ProductsTable, ProductsToolbar } from '@/components/catalog';
import { useProducts } from '@/hooks/catalog';

export function ProductsPage() {
  const { params, setParams, listQuery } = useProducts();

  const onSearch = (value: string) =>
    setParams((prev) => ({ ...prev, search: value || undefined, page: 1 }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Productos
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestiona el catálogo de tu restaurante.
        </p>
      </div>

      <ProductsToolbar
        search={params.search ?? ''}
        total={listQuery.data?.meta.total ?? 0}
        onSearch={onSearch}
      />

      <ProductsTable
        products={listQuery.data?.data ?? []}
        isLoading={listQuery.isLoading}
      />
    </div>
  );
}
