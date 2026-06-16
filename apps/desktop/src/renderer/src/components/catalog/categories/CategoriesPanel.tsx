import { Plus } from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProductCategoryDto } from '@/types/catalog';

interface CategoriesPanelProps {
  categories: ProductCategoryDto[];
  isLoading: boolean;
}

const CATEGORY_SKELETON_ROWS = [0, 1, 2, 3];

function CategorySkeleton({ row }: { row: number }) {
  return <Skeleton key={row} className="h-12 w-full" />;
}

function CategoryRow({ category }: { category: ProductCategoryDto }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-3">
      <div>
        <p className="text-sm font-semibold">{category.name}</p>
        <p className="nums mt-1 text-xs text-muted-foreground">Orden {category.sortOrder}</p>
      </div>
      <StatusPill tone={category.isActive ? 'green' : 'neutral'}>
        {category.isActive ? 'Activa' : 'Inactiva'}
      </StatusPill>
    </div>
  );
}

function renderCategorySkeleton(row: number) {
  return <CategorySkeleton key={row} row={row} />;
}

function renderCategoryRow(category: ProductCategoryDto) {
  return <CategoryRow key={category.id} category={category} />;
}

export function CategoriesPanel({ categories, isLoading }: CategoriesPanelProps) {
  return (
    <Card className="gap-4 border-border/80 py-5 shadow-none">
      <CardHeader className="px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Categorias</CardTitle>
            <CardDescription>Organizacion del menu</CardDescription>
          </div>
          <Button variant="outline" size="icon-sm" className="bg-background" disabled>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-5">
        {isLoading ? CATEGORY_SKELETON_ROWS.map(renderCategorySkeleton) : null}
        {!isLoading && categories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
            Aun no hay categorias.
          </div>
        ) : null}
        {!isLoading && categories.length > 0 ? categories.map(renderCategoryRow) : null}
      </CardContent>
    </Card>
  );
}
