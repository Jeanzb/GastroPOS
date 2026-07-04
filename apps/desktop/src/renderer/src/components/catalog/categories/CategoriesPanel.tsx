import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { CatalogDeleteDialog } from '@/components/catalog/CatalogDeleteDialog';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CategoryFormValues } from '@/schemas/catalog';
import type { ProductCategoryDto } from '@/types/catalog';
import { CategoryFormDialog } from './CategoryFormDialog';

interface CategoriesPanelProps {
  categories: ProductCategoryDto[];
  totalProducts: number;
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onCreate: (values: CategoryFormValues) => Promise<void>;
  onUpdate: (id: string, values: CategoryFormValues) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CATEGORY_SKELETON_ROWS = [0];
const CATEGORY_DOTS = ['#2F8F6B', '#C9892B', '#FF5A2C', '#7C746A', '#14865A', '#B5491F'];

function categoryDot(category: ProductCategoryDto, index: number): string {
  return CATEGORY_DOTS[(category.sortOrder + index) % CATEGORY_DOTS.length];
}

function CategorySkeleton({ row }: { row: number }) {
  return <Skeleton key={row} className="h-12 w-full" />;
}

function CategoryRow({
  category,
  index,
  onEdit,
  onDelete,
}: {
  category: ProductCategoryDto;
  index: number;
  onEdit: (category: ProductCategoryDto) => void;
  onDelete: (category: ProductCategoryDto) => void;
}) {
  const onEditClick = () => {
    onEdit(category);
  };
  const onDeleteClick = () => {
    onDelete(category);
  };

  return (
    <div className="motion-press flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3 text-foreground hover:border-orange/40 hover:bg-orange/5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="size-2.5 shrink-0 rounded-[3px]"
          style={{ background: categoryDot(category, index) }}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{category.name}</p>
          <p className="nums mt-0.5 text-xs text-muted-foreground">Orden {category.sortOrder}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusPill tone={category.isActive ? 'green' : 'neutral'}>
          {category.isActive ? 'Activa' : 'Inactiva'}
        </StatusPill>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Editar categoria"
          onClick={onEditClick}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Eliminar categoria"
          onClick={onDeleteClick}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function renderCategorySkeleton(row: number) {
  return <CategorySkeleton key={row} row={row} />;
}

export function CategoriesPanel({
  categories,
  totalProducts,
  isLoading,
  isSaving,
  isDeleting,
  onCreate,
  onUpdate,
  onDelete,
}: CategoriesPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryDto | undefined>();
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategoryDto | undefined>();

  const onCreateClick = () => {
    setSelectedCategory(undefined);
    setIsFormOpen(true);
  };

  const onEditCategory = (category: ProductCategoryDto) => {
    setSelectedCategory(category);
    setIsFormOpen(true);
  };

  const onDeleteCategory = (category: ProductCategoryDto) => {
    setCategoryToDelete(category);
  };

  const onFormSubmit = async (values: CategoryFormValues) => {
    if (selectedCategory) {
      await onUpdate(selectedCategory.id, values);
      return;
    }

    await onCreate(values);
  };

  const onConfirmDelete = async () => {
    if (!categoryToDelete) {
      return;
    }

    await onDelete(categoryToDelete.id);
    setCategoryToDelete(undefined);
  };

  const onDeleteOpenChange = (open: boolean) => {
    if (!open) {
      setCategoryToDelete(undefined);
    }
  };

  const renderCategoryRow = (category: ProductCategoryDto, index: number) => (
    <CategoryRow
      key={category.id}
      category={category}
      index={index}
      onEdit={onEditCategory}
      onDelete={onDeleteCategory}
    />
  );

  return (
    <>
      <Card className="gap-4 border-border/80 bg-surface-raised py-5 shadow-sm">
        <CardHeader className="px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Categorías</CardTitle>
              <CardDescription>Organización del menú</CardDescription>
              <p className="nums mt-2 text-xs font-semibold text-[#6B6359]">
                {totalProducts} productos totales
              </p>
            </div>
            <Button
              type="button"
              size="icon-sm"
              title="Nueva categoría"
              onClick={onCreateClick}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-5">
          {isLoading ? CATEGORY_SKELETON_ROWS.map(renderCategorySkeleton) : null}
          {!isLoading && categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-quiet px-4 py-8 text-center text-sm text-muted-foreground">
              Aún no hay categorías.
            </div>
          ) : null}
          {!isLoading && categories.length > 0 ? categories.map(renderCategoryRow) : null}
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={isFormOpen}
        category={selectedCategory}
        isSubmitting={isSaving}
        onOpenChange={setIsFormOpen}
        onSubmit={onFormSubmit}
      />

      <CatalogDeleteDialog
        open={Boolean(categoryToDelete)}
        title="Eliminar categoria"
        description={`Esta accion eliminara "${categoryToDelete?.name ?? ''}" si el backend lo permite.`}
        isDeleting={isDeleting}
        onOpenChange={onDeleteOpenChange}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
