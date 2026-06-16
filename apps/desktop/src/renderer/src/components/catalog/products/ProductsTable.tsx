import { StatusPill } from '@/components/operations';
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
  isLoading: boolean;
}

const SKELETON_ROWS = [0, 1, 2, 3, 4];

function ProductSkeletonRow({ row }: { row: number }) {
  return (
    <TableRow key={row}>
      <TableCell colSpan={6}>
        <Skeleton className="h-5 w-full" />
      </TableCell>
    </TableRow>
  );
}

function ProductRow({ product }: { product: ProductDto }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell className="text-muted-foreground">{product.sku ?? 'Sin SKU'}</TableCell>
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
    </TableRow>
  );
}

function renderSkeletonRow(row: number) {
  return <ProductSkeletonRow key={row} row={row} />;
}

function renderProductRow(product: ProductDto) {
  return <ProductRow key={product.id} product={product} />;
}

export function ProductsTable({ products, isLoading }: ProductsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead>Uso</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Actualizado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? SKELETON_ROWS.map(renderSkeletonRow) : null}
          {!isLoading && products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
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
