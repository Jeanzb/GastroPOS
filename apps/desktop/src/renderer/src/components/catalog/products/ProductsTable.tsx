import { Pencil, Trash2 } from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatMoney } from '@/lib';
import type { ProductDto } from '@/types/catalog';

interface ProductsTableProps {
  products: ProductDto[];
  categoryNames: Record<string, string>;
  isLoading: boolean;
  onEdit: (product: ProductDto) => void;
  onDelete: (product: ProductDto) => void;
}

const SKELETON_ROWS = [0, 1, 2, 3, 4];

function ProductSkeletonRow({ row }: { row: number }) {
  return (
    <TableRow key={row}>
      <TableCell colSpan={8}>
        <Skeleton className="h-5 w-full" />
      </TableCell>
    </TableRow>
  );
}

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
  const onEditClick = () => {
    onEdit(product);
  };
  const onDeleteClick = () => {
    onDelete(product);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell className="text-muted-foreground">{product.sku ?? 'Sin SKU'}</TableCell>
      <TableCell className="text-muted-foreground">{categoryName ?? 'Sin categoria'}</TableCell>
      <TableCell className="nums text-right">
        {formatMoney(product.priceAmount, product.currency)}
      </TableCell>
      <TableCell>
        <StatusPill tone={product.isSellable ? 'green' : 'neutral'}>
          {product.isSellable ? 'Vendible' : 'No vendible'}
        </StatusPill>
      </TableCell>
      <TableCell>
        <StatusPill tone={product.isActive ? 'green' : 'neutral'}>
          {product.isActive ? 'Activo' : 'Inactivo'}
        </StatusPill>
      </TableCell>
      <TableCell className="nums text-muted-foreground">{formatDate(product.updatedAt)}</TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Editar producto"
            onClick={onEditClick}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Eliminar producto"
            onClick={onDeleteClick}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function renderSkeletonRow(row: number) {
  return <ProductSkeletonRow key={row} row={row} />;
}

export function ProductsTable({
  products,
  categoryNames,
  isLoading,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  const renderProductRow = (product: ProductDto) => (
    <ProductRow
      key={product.id}
      product={product}
      categoryNames={categoryNames}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead>Uso</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Actualizado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? SKELETON_ROWS.map(renderSkeletonRow) : null}
          {!isLoading && products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                Aun no hay productos. Crea el primero para empezar.
              </TableCell>
            </TableRow>
          ) : null}
          {!isLoading && products.length > 0 ? products.map(renderProductRow) : null}
        </TableBody>
      </Table>
    </div>
  );
}
