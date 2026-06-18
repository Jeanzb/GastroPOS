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

const SKELETON_ROWS = [0, 1, 2, 3, 4];
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
    <div className={cn(GRID, 'border-b border-[#F2ECE3] px-[18px] py-[13px] transition-colors hover:bg-surface-quiet/50')}>
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
          <p className="truncate text-[11.5px] text-[#9A9286]">{initials(customer.name)} · {isCompany ? 'Empresa' : 'Persona'}</p>
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
        <p className="nums truncate text-[11.5px] text-[#9A9286]">{customer.phone ?? 'Sin teléfono'}</p>
      </div>
      <div>
        <DcChip tone={customer.isActive ? 'success' : 'neutral'}>
          {customer.isActive ? 'Activo' : 'Inactivo'}
        </DcChip>
      </div>
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="icon-sm" title="Editar cliente" onClick={() => onEdit(customer)}>
          <Pencil className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" title="Eliminar cliente" onClick={() => onDelete(customer)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function CustomersTable({ customers, isLoading, onEdit, onDelete }: CustomersTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className={cn(GRID, 'border-b border-border bg-surface-quiet/60 px-[18px] py-3')}>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#9A9286]">Cliente</span>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#9A9286]">Documento</span>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#9A9286]">Régimen</span>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#9A9286]">Contacto</span>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#9A9286]">Estado</span>
        <span className="text-right text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#9A9286]">Acciones</span>
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
          Aún no hay clientes. Crea el primero para facturar.
        </div>
      ) : null}

      {!isLoading
        ? customers.map((customer) => (
            <CustomerRow key={customer.id} customer={customer} onEdit={onEdit} onDelete={onDelete} />
          ))
        : null}
    </div>
  );
}
