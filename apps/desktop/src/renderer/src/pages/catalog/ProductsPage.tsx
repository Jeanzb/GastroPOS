import { useMemo, useState } from 'react';
import {
  CatalogDeleteDialog,
  CategoriesPanel,
  ProductFormDialog,
  ProductsTable,
  ProductsToolbar,
} from '@/components/catalog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategories, useProducts } from '@/hooks/catalog';
import { useInventory } from '@/hooks/inventory';
import { useAppToast } from '@/hooks/ui';
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
    name: values.identity.name,
    priceAmount: values.pricing.amount,
    currency: values.pricing.currency.toUpperCase(),
    categoryId: normalizeOptionalString(values.identity.categoryId),
    sku: normalizeOptionalString(values.identity.sku),
    description: normalizeOptionalString(values.details.description),
    isActive: values.availability.isActive,
    isSellable: values.availability.isSellable,
    isInventoried: values.availability.isInventoried,
    recipeIngredients: values.availability.isInventoried
      ? values.recipe.ingredients.map((ingredient) => ({
          ingredientId: ingredient.ingredientId,
          quantity: ingredient.quantity,
        }))
      : [],
  };
}

function buildCategoryNames(categories: ProductCategoryDto[]): Record<string, string> {
  return categories.reduce<Record<string, string>>((accumulator, category) => {
    accumulator[category.id] = category.name;
    return accumulator;
  }, {});
}

export function ProductsPage() {
  const appToast = useAppToast();
  const categories = useCategories();
  const products = useProducts();
  const inventory = useInventory();
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDto>();
  const [productToDelete, setProductToDelete] = useState<ProductDto>();
  const categoryList = categories.listQuery.data?.data ?? EMPTY_CATEGORIES;
  const productList = products.listQuery.data?.data ?? EMPTY_PRODUCTS;
  const inventoryItems = inventory.itemsQuery.data?.data ?? [];
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
      appToast.success('Categoria creada', `${values.name} ya puede agrupar productos del menú.`);
    } catch (error) {
      appToast.error(
        'No se pudo crear la categoria',
        getErrorMessage(error, 'Revisa el nombre y vuelve a intentarlo.'),
      );
      throw error;
    }
  };

  const onUpdateCategory = async (id: string, values: CategoryFormValues) => {
    try {
      await categories.updateMutation.mutateAsync({
        id,
        payload: toCategoryPayload(values),
      });
      appToast.success(
        'Categoria actualizada',
        `${values.name} quedo sincronizada con el catalogo.`,
      );
    } catch (error) {
      appToast.error(
        'No se pudo actualizar la categoria',
        getErrorMessage(error, 'El cambio no fue guardado.'),
      );
      throw error;
    }
  };

  const onDeleteCategory = async (id: string) => {
    try {
      await categories.deleteMutation.mutateAsync(id);
      appToast.success('Categoria eliminada', 'El catalogo se actualizo para la sede activa.');
    } catch (error) {
      appToast.error(
        'No se pudo eliminar la categoria',
        getErrorMessage(error, 'Puede tener productos asociados.'),
      );
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
        appToast.success(
          'Producto actualizado',
          `${values.identity.name} quedó listo para POS e inventario.`,
        );
        return;
      }

      await products.createMutation.mutateAsync(toProductPayload(values));
      appToast.success(
        'Producto creado',
        `${values.identity.name} ya aparece en el catálogo operativo.`,
      );
    } catch (error) {
      appToast.error(
        'No se pudo guardar el producto',
        getErrorMessage(error, 'Valida precio, categoria y estado.'),
      );
      throw error;
    }
  };

  const onConfirmProductDelete = async () => {
    if (!productToDelete) {
      return;
    }

    try {
      await products.deleteMutation.mutateAsync(productToDelete.id);
      appToast.success('Producto eliminado', `${productToDelete.name} salio del catalogo activo.`);
      setProductToDelete(undefined);
    } catch (error) {
      appToast.error(
        'No se pudo eliminar el producto',
        getErrorMessage(error, 'Si tiene historial, debe inactivarse.'),
      );
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
            totalProducts={products.listQuery.data?.meta.total ?? productList.length}
            isLoading={categories.listQuery.isLoading}
            isSaving={isCategorySaving}
            isDeleting={categories.deleteMutation.isPending}
            onCreate={onCreateCategory}
            onUpdate={onUpdateCategory}
            onDelete={onDeleteCategory}
          />
        </aside>

        <Card className="gap-4 border-border/80 bg-surface-raised py-5 shadow-sm">
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
        products={productList}
        inventoryItems={inventoryItems}
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
