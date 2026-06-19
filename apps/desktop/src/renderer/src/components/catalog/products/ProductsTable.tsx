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
  onEdit: (product: ProductDto) => void;
  onDelete: (product: ProductDto) => void;
}

const SKELETON_ROWS = [0, 1, 2, 3, 4];
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

const HEADER = 'text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#9A9286]';

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
    <div className={cn(GRID, 'border-b border-[#F2ECE3] px-[18px] py-[13px] transition-colors hover:bg-surface-quiet/50')}>
      <div className="flex items-center gap-3">
        <span
          className="font-display flex size-[34px] shrink-0 items-center justify-center rounded-[9px] text-[13px] font-bold text-white"
          style={{ background: swatchColor(product.id) }}
        >
          {initials(product.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{product.name}</p>
          <p className="nums truncate text-[11px] text-[#9A9286]">{product.sku ?? 'Sin SKU'}</p>
        </div>
      </div>
      <p className="truncate text-[13px] text-[#6B6359]">{categoryName ?? 'Sin categoría'}</p>
      <p className="nums text-right text-[13.5px] font-bold">
        {formatMoney(product.priceAmount, product.currency)}
      </p>
      <div className="flex justify-end">
        <DcChip tone={product.isActive ? 'success' : 'neutral'}>
          {product.isActive ? 'Activo' : 'Inactivo'}
        </DcChip>
      </div>
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="icon-sm" title="Editar producto" onClick={() => onEdit(product)}>
          <Pencil className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" title="Eliminar producto" onClick={() => onDelete(product)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function ProductsTable({ products, categoryNames, isLoading, onEdit, onDelete }: ProductsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className={cn(GRID, 'border-b border-border bg-surface-quiet/60 px-[18px] py-3')}>
        <span className={HEADER}>Producto</span>
        <span className={HEADER}>Categoría</span>
        <span className={cn(HEADER, 'text-right')}>Precio</span>
        <span className={cn(HEADER, 'text-right')}>Estado</span>
        <span className={cn(HEADER, 'text-right')}>Acciones</span>
      </div>

      <div className="max-h-[calc(100vh-292px)] min-h-[320px] overflow-y-auto">
      {isLoading
        ? SKELETON_ROWS.map((row) => (
            <div key={row} className="border-b border-[#F2ECE3] px-[18px] py-[15px]">
              <Skeleton className="h-6 w-full" />
            </div>
          ))
        : null}

      {!isLoading && products.length === 0 ? (
        <div className="px-[18px] py-12 text-center text-sm text-muted-foreground">
          Aún no hay productos. Crea el primero para empezar.
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
  );
}
