import { CategoriesPanel, ProductsTable, ProductsToolbar } from '@/components/catalog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategories, useProducts } from '@/hooks/catalog';

export function ProductsPage() {
  const categories = useCategories();
  const products = useProducts();

  const onSearch = (value: string) => {
    products.setParams((prev) => ({
      ...prev,
      search: value || undefined,
      page: 1,
    }));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside>
        <CategoriesPanel
          categories={categories.listQuery.data?.data ?? []}
          isLoading={categories.listQuery.isLoading}
        />
      </aside>

      <Card className="gap-4 border-border/80 py-5 shadow-none">
        <CardHeader className="px-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Productos del menu</CardTitle>
              <CardDescription>Precios, SKU, disponibilidad e inventario asociado</CardDescription>
            </div>
            <ProductsToolbar
              search={products.params.search ?? ''}
              total={products.listQuery.data?.meta.total ?? 0}
              onSearch={onSearch}
            />
          </div>
        </CardHeader>
        <CardContent className="px-5">
          <ProductsTable
            products={products.listQuery.data?.data ?? []}
            isLoading={products.listQuery.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
