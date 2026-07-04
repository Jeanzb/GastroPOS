import { Pencil, Trash2 } from 'lucide-react';
import { DcChip } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib';
import { cn } from '@/lib/utils';
import type { ProductDto } from '@/types/catalog';

interface ProductsTableProps {
  products: ProductDto[];
  categoryNames: Record<string, string>;
  isLoading: boolean;
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onEdit: (product: ProductDto) => void;
  onDelete: (product: ProductDto) => void;
}

const SKELETON_ROWS = [0];
const GRID = 'grid grid-cols-[2fr_1fr_0.9fr_0.8fr_auto] items-center gap-3';
const SWATCHES = ['#2F8F6B', '#C9892B', '#FF5A2C', '#7C746A', '#14865A', '#B5491F'];

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function swatchColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) % SWATCHES.length;
  }
  return SWATCHES[hash];
}

const HEADER = 'text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6B6359]';

function ProductRow({
  product,
  categoryNames,
  onEdit,
  onDelete,
}: {
  product: ProductDto;
  categoryNames: Record<string, string>;
  onEdit: (product: ProductDto) => void;
  onDelete: (product: ProductDto) => void;
}) {
  const categoryName = product.categoryId ? categoryNames[product.categoryId] : undefined;

  return (
    <div
      className={cn(
        GRID,
        'min-w-[780px] border-b border-[#F2ECE3] px-[18px] py-[13px] transition-colors hover:bg-surface-quiet/50 md:min-w-0',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className="font-display flex size-[34px] shrink-0 items-center justify-center rounded-[9px] text-[13px] font-bold text-white"
          style={{ background: swatchColor(product.id) }}
        >
          {initials(product.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{product.name}</p>
          <p className="nums truncate text-[11px] text-[#6B6359]">
            {product.sku ?? 'Sin SKU'}
            {product.inventoryLink ? ` · Inv. ${product.inventoryLink.sku}` : ''}
          </p>
          {product.isInventoried ? (
            <p className="truncate text-[11px] text-[#6B6359]">
              {product.recipe?.ingredients.length
                ? `Receta: ${product.recipe.ingredients.length} insumos`
                : product.inventoryLink
                  ? 'Consumo 1:1 enlazado'
                  : 'Inventario pendiente'}
            </p>
          ) : null}
        </div>
      </div>
      <p className="truncate text-[13px] text-[#6B6359]">{categoryName ?? 'Sin categoria'}</p>
      <p className="nums text-right text-[13.5px] font-bold">
        {formatMoney(product.priceAmount, product.currency)}
      </p>
      <div className="flex justify-end">
        <DcChip tone={product.isActive ? 'success' : 'neutral'}>
          {product.isActive ? 'Activo' : 'Inactivo'}
        </DcChip>
      </div>
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hit-area"
          title="Editar producto"
          onClick={() => onEdit(product)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hit-area"
          title="Eliminar producto"
          onClick={() => onDelete(product)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  categoryNames,
  onEdit,
  onDelete,
}: {
  product: ProductDto;
  categoryNames: Record<string, string>;
  onEdit: (product: ProductDto) => void;
  onDelete: (product: ProductDto) => void;
}) {
  const categoryName = product.categoryId ? categoryNames[product.categoryId] : undefined;

  return (
    <div
      className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm"
      data-cy="product-mobile-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="font-display flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: swatchColor(product.id) }}
          >
            {initials(product.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{product.name}</p>
            <p className="nums mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {product.sku ?? 'Sin SKU'}
            </p>
          </div>
        </div>
        <DcChip tone={product.isActive ? 'success' : 'neutral'}>
          {product.isActive ? 'Activo' : 'Inactivo'}
        </DcChip>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-background px-3 py-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Categoria</p>
          <p className="mt-1 truncate text-[12.5px] font-semibold">
            {categoryName ?? 'Sin categoria'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Precio</p>
          <p className="nums mt-1 text-[13px] font-bold">
            {formatMoney(product.priceAmount, product.currency)}
          </p>
        </div>
      </div>

      {product.isInventoried ? (
        <p className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-muted-foreground">
          {product.recipe?.ingredients.length
            ? `Receta: ${product.recipe.ingredients.length} insumos`
            : product.inventoryLink
              ? `Inventario ${product.inventoryLink.sku}`
              : 'Inventario pendiente'}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => onEdit(product)}
        >
          <Pencil className="size-4" />
          Editar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 text-destructive"
          onClick={() => onDelete(product)}
        >
          <Trash2 className="size-4" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}

export function ProductsTable({
  products,
  categoryNames,
  isLoading,
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid gap-3 p-3 md:hidden">
        {isLoading
          ? SKELETON_ROWS.map((row) => (
              <div key={row} className="rounded-2xl border border-border bg-surface-raised p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </div>
            ))
          : null}

        {!isLoading && products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-raised px-5 py-10 text-center text-sm text-muted-foreground">
            Aun no hay productos. Crea el primero para empezar.
          </div>
        ) : null}

        {!isLoading
          ? products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                categoryNames={categoryNames}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          : null}
      </div>

      <div className="scrollbar-none hidden overflow-x-auto md:block">
        <div
          className={cn(
            GRID,
            'min-w-[780px] border-b border-border bg-surface-quiet/60 px-[18px] py-3 md:min-w-0',
          )}
        >
          <span className={HEADER}>Producto</span>
          <span className={HEADER}>Categoria</span>
          <span className={cn(HEADER, 'text-right')}>Precio</span>
          <span className={cn(HEADER, 'text-right')}>Estado</span>
          <span className={cn(HEADER, 'text-right')}>Acciones</span>
        </div>

        <div className="scrollbar-none max-h-[min(560px,calc(100vh-330px))] min-h-[320px] overflow-y-auto">
          {isLoading
            ? SKELETON_ROWS.map((row) => (
                <div key={row} className="border-b border-[#F2ECE3] px-[18px] py-[15px]">
                  <Skeleton className="h-6 w-full" />
                </div>
              ))
            : null}

          {!isLoading && products.length === 0 ? (
            <div className="px-[18px] py-12 text-center text-sm text-muted-foreground">
              Aun no hay productos. Crea el primero para empezar.
            </div>
          ) : null}

          {!isLoading
            ? products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  categoryNames={categoryNames}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-[18px]">
        <p className="nums text-xs text-muted-foreground">
          {isLoading ? 'Cargando productos' : `${from}-${to} de ${total} productos`}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading || page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
