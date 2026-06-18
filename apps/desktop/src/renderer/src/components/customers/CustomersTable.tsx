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
import type { CustomerDto } from '@/types/customers';

interface CustomersTableProps {
  customers: CustomerDto[];
  isLoading: boolean;
  onEdit: (customer: CustomerDto) => void;
  onDelete: (customer: CustomerDto) => void;
}

const SKELETON_ROWS = [0, 1, 2, 3, 4];

function CustomerSkeletonRow({ row }: { row: number }) {
  return (
    <TableRow key={row}>
      <TableCell colSpan={6}>
        <Skeleton className="h-5 w-full" />
      </TableCell>
    </TableRow>
  );
}

function CustomerRow({
  customer,
  onEdit,
  onDelete,
}: {
  customer: CustomerDto;
  onEdit: (customer: CustomerDto) => void;
  onDelete: (customer: CustomerDto) => void;
}) {
  const onEditClick = () => {
    onEdit(customer);
  };
  const onDeleteClick = () => {
    onDelete(customer);
  };

  return (
    <TableRow>
      <TableCell className="nums text-muted-foreground">
        {customer.documentType} {customer.documentNumber}
      </TableCell>
      <TableCell className="font-medium">{customer.name}</TableCell>
      <TableCell className="text-muted-foreground">{customer.email ?? 'Sin correo'}</TableCell>
      <TableCell className="nums text-muted-foreground">{customer.phone ?? '-'}</TableCell>
      <TableCell>
        <StatusPill tone={customer.isActive ? 'green' : 'neutral'}>
          {customer.isActive ? 'Activo' : 'Inactivo'}
        </StatusPill>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Editar cliente"
            onClick={onEditClick}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Eliminar cliente"
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
  return <CustomerSkeletonRow key={row} row={row} />;
}

export function CustomersTable({
  customers,
  isLoading,
  onEdit,
  onDelete,
}: CustomersTableProps) {
  const renderCustomerRow = (customer: CustomerDto) => (
    <CustomerRow
      key={customer.id}
      customer={customer}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Documento</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Telefono</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? SKELETON_ROWS.map(renderSkeletonRow) : null}
          {!isLoading && customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                Aun no hay clientes. Crea el primero para facturar.
              </TableCell>
            </TableRow>
          ) : null}
          {!isLoading && customers.length > 0 ? customers.map(renderCustomerRow) : null}
        </TableBody>
      </Table>
    </div>
  );
}
