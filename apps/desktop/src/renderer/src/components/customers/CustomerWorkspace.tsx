import { useMemo, useState, type ChangeEvent } from 'react';
import { Plus, Receipt, Search } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/operations';
import { useCustomers } from '@/hooks/customers';
import { useAppToast } from '@/hooks/ui';
import type { CustomerFormValues } from '@/schemas/customers';
import type { CreateCustomerPayload, CustomerDto } from '@/types/customers';
import { CustomerFormDialog } from './CustomerFormDialog';
import { CustomersTable } from './CustomersTable';

const EMPTY_CUSTOMERS: CustomerDto[] = [];

function isIvaResponsible(tax: string | null): boolean {
  const value = (tax ?? '').toLowerCase();
  return value.includes('iva') || value === 'responsable' || value.includes('gran contribuyente');
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function normalizeOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toCustomerPayload(values: CustomerFormValues): CreateCustomerPayload {
  return {
    documentType: values.documentType,
    documentNumber: values.documentNumber.trim(),
    name: values.name.trim(),
    email: normalizeOptional(values.email),
    phone: normalizeOptional(values.phone),
    address: normalizeOptional(values.address),
    municipality: normalizeOptional(values.municipality),
    taxResponsibility: normalizeOptional(values.taxResponsibility),
    isActive: values.isActive,
  };
}

export function CustomerWorkspace() {
  const appToast = useAppToast();
  const customers = useCustomers();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto>();
  const [customerToDelete, setCustomerToDelete] = useState<CustomerDto>();
  const customerList = customers.listQuery.data?.data ?? EMPTY_CUSTOMERS;
  const total = customers.listQuery.data?.meta.total ?? customerList.length;
  const isSaving =
    customers.createMutation.isPending || customers.updateMutation.isPending;

  const stats = useMemo(() => {
    const active = customerList.filter((customer) => customer.isActive).length;
    const iva = customerList.filter((customer) => isIvaResponsible(customer.taxResponsibility)).length;
    const companies = customerList.filter((customer) => customer.documentType === 'NIT').length;
    return { active, iva, companies };
  }, [customerList]);

  const onSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    customers.setParams((prev) => ({
      ...prev,
      search: value || undefined,
      page: 1,
    }));
  };

  const onCreateClick = () => {
    setSelectedCustomer(undefined);
    setIsFormOpen(true);
  };

  const onEdit = (customer: CustomerDto) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const onDelete = (customer: CustomerDto) => {
    setCustomerToDelete(customer);
  };

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      if (selectedCustomer) {
        await customers.updateMutation.mutateAsync({
          id: selectedCustomer.id,
          payload: toCustomerPayload(values),
        });
        appToast.success('Cliente actualizado', `${values.name} quedo listo para facturacion electronica.`);
        return;
      }
      await customers.createMutation.mutateAsync(toCustomerPayload(values));
      appToast.clienteRegistrado();
    } catch (error) {
      appToast.error(
        'No se pudo guardar el cliente',
        getErrorMessage(error, 'Revisa documento, nombre y correo.'),
      );
      throw error;
    }
  };

  const onConfirmDelete = async () => {
    if (!customerToDelete) {
      return;
    }
    try {
      await customers.deleteMutation.mutateAsync(customerToDelete.id);
      appToast.success('Cliente eliminado', `${customerToDelete.name} salio del registro fiscal activo.`);
      setCustomerToDelete(undefined);
    } catch (error) {
      appToast.error(
        'No se pudo eliminar el cliente',
        getErrorMessage(error, 'El registro puede estar relacionado con documentos.'),
      );
    }
  };

  const onDeleteOpenChange = (open: boolean) => {
    if (!open) {
      setCustomerToDelete(undefined);
    }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start gap-4 rounded-2xl border border-orange/20 bg-orange/[0.07] p-[18px]">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange text-white">
            <Receipt className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[16px] font-bold tracking-tight text-foreground">
              Facturación electrónica DIAN
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#6B6359]">
              Este directorio guarda los datos fiscales (documento, régimen y contacto) que se usan
              para emitir facturas electrónicas, notas y documentos soporte ante la DIAN.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[14px] lg:grid-cols-4">
          <KpiCard label="Clientes registrados" value={total} hint="Total en el registro fiscal" />
          <KpiCard label="Activos" value={stats.active} hint="Disponibles para facturar" accent="success" />
          <KpiCard label="Responsables de IVA" value={stats.iva} hint="Régimen con retención" />
          <KpiCard label="Empresas (NIT)" value={stats.companies} hint="Personas jurídicas" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-4">
            <div>
              <h2 className="font-display text-[18px] font-bold tracking-tight">Directorio de clientes</h2>
              <p className="text-[12.5px] text-[#9A9286]">Régimen fiscal y contacto por cliente</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={customers.params.search ?? ''}
                  onChange={onSearch}
                  placeholder="Buscar por nombre, documento o correo"
                  className="pl-9"
                />
              </div>
              <Button onClick={onCreateClick}>
                <Plus className="size-4" />
                Nuevo cliente
              </Button>
            </div>
          </div>
          <div className="p-4">
            <CustomersTable
              customers={customerList}
              isLoading={customers.listQuery.isLoading}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>
      </div>

      <CustomerFormDialog
        open={isFormOpen}
        customer={selectedCustomer}
        isSubmitting={isSaving}
        onOpenChange={setIsFormOpen}
        onSubmit={onSubmit}
      />

      <AlertDialog open={Boolean(customerToDelete)} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara a &quot;{customerToDelete?.name ?? ''}&quot; del
              registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={customers.deleteMutation.isPending}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
