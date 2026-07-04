import { Building2, Pencil, Trash2, User } from 'lucide-react';
import { DcChip, type DcChipTone } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CustomerDto } from '@/types/customers';

interface CustomersTableProps {
  customers: CustomerDto[];
  isLoading: boolean;
  onEdit: (customer: CustomerDto) => void;
  onDelete: (customer: CustomerDto) => void;
}

const SKELETON_ROWS = [0];
const GRID = 'grid grid-cols-[1.6fr_1fr_1.1fr_1.3fr_0.7fr_auto] items-center gap-3';

function regimeChip(tax: string | null): { label: string; tone: DcChipTone } {
  const value = (tax ?? '').toLowerCase();
  if (value.includes('gran contribuyente')) {
    return { label: 'Gran contribuyente', tone: 'ink' };
  }
  if (value.includes('no responsable')) {
    return { label: 'No responsable', tone: 'neutral' };
  }
  if (value.includes('iva') || value === 'responsable') {
    return { label: 'Responsable de IVA', tone: 'success' };
  }
  if (tax && tax.trim()) {
    return { label: tax.trim(), tone: 'neutral' };
  }
  return { label: 'Consumidor final', tone: 'warning' };
}

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

function CustomerRow({
  customer,
  onEdit,
  onDelete,
}: {
  customer: CustomerDto;
  onEdit: (customer: CustomerDto) => void;
  onDelete: (customer: CustomerDto) => void;
}) {
  const regime = regimeChip(customer.taxResponsibility);
  const isCompany = customer.documentType === 'NIT';

  return (
    <div
      className={cn(
        GRID,
        'min-w-[860px] border-b border-[#F2ECE3] px-[18px] py-[13px] transition-colors hover:bg-surface-quiet/50 lg:min-w-0',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-[10px] text-white',
            isCompany ? 'bg-carbon' : 'bg-orange',
          )}
        >
          {isCompany ? <Building2 className="size-4" /> : <User className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{customer.name}</p>
          <p className="truncate text-[11.5px] text-[#6B6359]">
            {initials(customer.name)} · {isCompany ? 'Empresa' : 'Persona'}
          </p>
        </div>
      </div>
      <p className="nums text-[12.5px] text-[#6B6359]">
        {customer.documentType} {customer.documentNumber}
      </p>
      <div>
        <DcChip tone={regime.tone}>{regime.label}</DcChip>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] text-foreground">{customer.email ?? 'Sin correo'}</p>
        <p className="nums truncate text-[11.5px] text-[#6B6359]">
          {customer.phone ?? 'Sin teléfono'}
        </p>
      </div>
      <div>
        <DcChip tone={customer.isActive ? 'success' : 'neutral'}>
          {customer.isActive ? 'Activo' : 'Inactivo'}
        </DcChip>
      </div>
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="hit-area"
          title="Editar cliente"
          onClick={() => onEdit(customer)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="hit-area"
          title="Eliminar cliente"
          onClick={() => onDelete(customer)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function CustomerCard({
  customer,
  onEdit,
  onDelete,
}: {
  customer: CustomerDto;
  onEdit: (customer: CustomerDto) => void;
  onDelete: (customer: CustomerDto) => void;
}) {
  const regime = regimeChip(customer.taxResponsibility);
  const isCompany = customer.documentType === 'NIT';

  return (
    <div
      className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm"
      data-cy="customer-mobile-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl text-white',
              isCompany ? 'bg-carbon' : 'bg-orange',
            )}
          >
            {isCompany ? <Building2 className="size-4" /> : <User className="size-4" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{customer.name}</p>
            <p className="nums mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {customer.documentType} {customer.documentNumber}
            </p>
          </div>
        </div>
        <DcChip tone={customer.isActive ? 'success' : 'neutral'}>
          {customer.isActive ? 'Activo' : 'Inactivo'}
        </DcChip>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl bg-background px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">Regimen</span>
          <DcChip tone={regime.tone}>{regime.label}</DcChip>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Contacto</p>
          <p className="mt-1 truncate text-[12.5px] font-semibold">
            {customer.email ?? 'Sin correo'}
          </p>
          <p className="nums truncate text-[11.5px] text-muted-foreground">
            {customer.phone ?? 'Sin telefono'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => onEdit(customer)}
        >
          <Pencil className="size-4" />
          Editar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 text-destructive"
          onClick={() => onDelete(customer)}
        >
          <Trash2 className="size-4" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}

export function CustomersTable({ customers, isLoading, onEdit, onDelete }: CustomersTableProps) {
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

        {!isLoading && customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-raised px-5 py-10 text-center text-sm text-muted-foreground">
            Aun no hay clientes. Crea el primero para facturar.
          </div>
        ) : null}

        {!isLoading
          ? customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
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
            'min-w-[860px] border-b border-border bg-surface-quiet/60 px-[18px] py-3 lg:min-w-0',
          )}
        >
          <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6B6359]">
            Cliente
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6B6359]">
            Documento
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6B6359]">
            Regimen
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6B6359]">
            Contacto
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6B6359]">
            Estado
          </span>
          <span className="text-right text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6B6359]">
            Acciones
          </span>
        </div>

        {isLoading
          ? SKELETON_ROWS.map((row) => (
              <div key={row} className="border-b border-[#F2ECE3] px-[18px] py-[15px]">
                <Skeleton className="h-6 w-full" />
              </div>
            ))
          : null}

        {!isLoading && customers.length === 0 ? (
          <div className="px-[18px] py-12 text-center text-sm text-muted-foreground">
            Aun no hay clientes. Crea el primero para facturar.
          </div>
        ) : null}

        {!isLoading
          ? customers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          : null}
      </div>
    </div>
  );
}
