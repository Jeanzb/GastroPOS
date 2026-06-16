import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CatalogDeleteDialog,
  CategoriesPanel,
  ProductFormDialog,
  ProductsTable,
  ProductsToolbar,
} from '@/components/catalog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategories, useProducts } from '@/hooks/catalog';
import type { CategoryFormValues, ProductFormValues } from '@/schemas/catalog';
import type {
  CreateCategoryPayload,
  CreateProductPayload,
  ProductCategoryDto,
  ProductDto,
} from '@/types/catalog';

const EMPTY_CATEGORIES: ProductCategoryDto[] = [];
const EMPTY_PRODUCTS: ProductDto[] = [];

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function normalizeOptionalString(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toCategoryPayload(values: CategoryFormValues): CreateCategoryPayload {
  return {
    name: values.name,
    sortOrder: values.sortOrder,
    isActive: values.isActive,
  };
}

function toProductPayload(values: ProductFormValues): CreateProductPayload {
  return {
    name: values.name,
    priceAmount: values.priceAmount,
    currency: values.currency.toUpperCase(),
    categoryId: normalizeOptionalString(values.categoryId),
    sku: normalizeOptionalString(values.sku),
    description: normalizeOptionalString(values.description),
    isActive: values.isActive,
    isSellable: values.isSellable,
    isInventoried: values.isInventoried,
  };
}

function buildCategoryNames(categories: ProductCategoryDto[]): Record<string, string> {
  return categories.reduce<Record<string, string>>((accumulator, category) => {
    accumulator[category.id] = category.name;
    return accumulator;
  }, {});
}

export function ProductsPage() {
  const categories = useCategories();
  const products = useProducts();
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDto>();
  const [productToDelete, setProductToDelete] = useState<ProductDto>();
  const categoryList = categories.listQuery.data?.data ?? EMPTY_CATEGORIES;
  const productList = products.listQuery.data?.data ?? EMPTY_PRODUCTS;
  const categoryNames = useMemo(() => buildCategoryNames(categoryList), [categoryList]);
  const isCategorySaving =
    categories.createMutation.isPending || categories.updateMutation.isPending;
  const isProductSaving = products.createMutation.isPending || products.updateMutation.isPending;

  const onSearch = (value: string) => {
    products.setParams((prev) => ({
      ...prev,
      search: value || undefined,
      page: 1,
    }));
  };

  const onCreateProductClick = () => {
    setSelectedProduct(undefined);
    setIsProductFormOpen(true);
  };

  const onEditProduct = (product: ProductDto) => {
    setSelectedProduct(product);
    setIsProductFormOpen(true);
  };

  const onDeleteProduct = (product: ProductDto) => {
    setProductToDelete(product);
  };

  const onCreateCategory = async (values: CategoryFormValues) => {
    try {
      await categories.createMutation.mutateAsync(toCategoryPayload(values));
      toast.success('Categoria creada');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo crear la categoria'));
      throw error;
    }
  };

  const onUpdateCategory = async (id: string, values: CategoryFormValues) => {
    try {
      await categories.updateMutation.mutateAsync({
        id,
        payload: toCategoryPayload(values),
      });
      toast.success('Categoria actualizada');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar la categoria'));
      throw error;
    }
  };

  const onDeleteCategory = async (id: string) => {
    try {
      await categories.deleteMutation.mutateAsync(id);
      toast.success('Categoria eliminada');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar la categoria'));
      throw error;
    }
  };

  const onSubmitProduct = async (values: ProductFormValues) => {
    try {
      if (selectedProduct) {
        await products.updateMutation.mutateAsync({
          id: selectedProduct.id,
          payload: toProductPayload(values),
        });
        toast.success('Producto actualizado');
        return;
      }

      await products.createMutation.mutateAsync(toProductPayload(values));
      toast.success('Producto creado');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar el producto'));
      throw error;
    }
  };

  const onConfirmProductDelete = async () => {
    if (!productToDelete) {
      return;
    }

    try {
      await products.deleteMutation.mutateAsync(productToDelete.id);
      toast.success('Producto eliminado');
      setProductToDelete(undefined);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar el producto'));
      throw error;
    }
  };

  const onProductDeleteOpenChange = (open: boolean) => {
    if (!open) {
      setProductToDelete(undefined);
    }
  };

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside>
          <CategoriesPanel
            categories={categoryList}
            isLoading={categories.listQuery.isLoading}
            isSaving={isCategorySaving}
            isDeleting={categories.deleteMutation.isPending}
            onCreate={onCreateCategory}
            onUpdate={onUpdateCategory}
            onDelete={onDeleteCategory}
          />
        </aside>

        <Card className="gap-4 border-border/80 py-5 shadow-none">
          <CardHeader className="px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Productos del menu</CardTitle>
                <CardDescription>
                  Precios, SKU, disponibilidad e inventario asociado
                </CardDescription>
              </div>
              <ProductsToolbar
                search={products.params.search ?? ''}
                total={products.listQuery.data?.meta.total ?? 0}
                onSearch={onSearch}
                onCreate={onCreateProductClick}
              />
            </div>
          </CardHeader>
          <CardContent className="px-5">
            <ProductsTable
              products={productList}
              categoryNames={categoryNames}
              isLoading={products.listQuery.isLoading}
              onEdit={onEditProduct}
              onDelete={onDeleteProduct}
            />
          </CardContent>
        </Card>
      </div>

      <ProductFormDialog
        open={isProductFormOpen}
        product={selectedProduct}
        categories={categoryList}
        isSubmitting={isProductSaving}
        onOpenChange={setIsProductFormOpen}
        onSubmit={onSubmitProduct}
      />

      <CatalogDeleteDialog
        open={Boolean(productToDelete)}
        title="Eliminar producto"
        description={`Esta accion eliminara "${productToDelete?.name ?? ''}" si el backend lo permite.`}
        isDeleting={products.deleteMutation.isPending}
        onOpenChange={onProductDeleteOpenChange}
        onConfirm={onConfirmProductDelete}
      />
    </>
  );
}
