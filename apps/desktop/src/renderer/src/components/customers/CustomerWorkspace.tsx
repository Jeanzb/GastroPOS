import { useState, type ChangeEvent } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCustomers } from '@/hooks/customers';
import type { CustomerFormValues } from '@/schemas/customers';
import type { CreateCustomerPayload, CustomerDto } from '@/types/customers';
import { CustomerFormDialog } from './CustomerFormDialog';
import { CustomersTable } from './CustomersTable';

const EMPTY_CUSTOMERS: CustomerDto[] = [];

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
  const customers = useCustomers();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto>();
  const [customerToDelete, setCustomerToDelete] = useState<CustomerDto>();
  const customerList = customers.listQuery.data?.data ?? EMPTY_CUSTOMERS;
  const isSaving =
    customers.createMutation.isPending || customers.updateMutation.isPending;

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
        toast.success('Cliente actualizado');
        return;
      }
      await customers.createMutation.mutateAsync(toCustomerPayload(values));
      toast.success('Cliente creado');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar el cliente'));
      throw error;
    }
  };

  const onConfirmDelete = async () => {
    if (!customerToDelete) {
      return;
    }
    try {
      await customers.deleteMutation.mutateAsync(customerToDelete.id);
      toast.success('Cliente eliminado');
      setCustomerToDelete(undefined);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar el cliente'));
    }
  };

  const onDeleteOpenChange = (open: boolean) => {
    if (!open) {
      setCustomerToDelete(undefined);
    }
  };

  return (
    <>
      <Card className="gap-4 border-border/80 py-5 shadow-none">
        <CardHeader className="px-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>
                Registro fiscal para emitir facturas electronicas a la DIAN
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={customers.params.search ?? ''}
                  onChange={onSearch}
                  placeholder="Buscar por nombre, documento o correo"
                  className="pl-9"
                />
              </div>
              <Button onClick={onCreateClick}>Nuevo cliente</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5">
          <CustomersTable
            customers={customerList}
            isLoading={customers.listQuery.isLoading}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </CardContent>
      </Card>

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
