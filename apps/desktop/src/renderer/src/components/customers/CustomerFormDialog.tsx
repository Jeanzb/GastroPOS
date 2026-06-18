import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  CUSTOMER_DOCUMENT_TYPES,
  customerFormSchema,
  type CustomerFormValues,
} from '@/schemas/customers';
import type { CustomerDto } from '@/types/customers';

interface CustomerFormDialogProps {
  open: boolean;
  customer?: CustomerDto;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
}

const DOCUMENT_TYPE_LABELS: Record<
  (typeof CUSTOMER_DOCUMENT_TYPES)[number],
  string
> = {
  CC: 'Cedula de ciudadania (CC)',
  NIT: 'NIT',
  CE: 'Cedula de extranjeria (CE)',
  PP: 'Pasaporte (PP)',
  TI: 'Tarjeta de identidad (TI)',
  NUIP: 'NUIP',
  OTHER: 'Otro',
};

function getDefaultValues(customer?: CustomerDto): CustomerFormValues {
  return {
    documentType: customer?.documentType ?? 'CC',
    documentNumber: customer?.documentNumber ?? '',
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    address: customer?.address ?? '',
    municipality: customer?.municipality ?? '',
    taxResponsibility: customer?.taxResponsibility ?? '',
    isActive: customer?.isActive ?? true,
  };
}

function renderDocumentTypeOption(type: (typeof CUSTOMER_DOCUMENT_TYPES)[number]) {
  return (
    <SelectItem key={type} value={type}>
      {DOCUMENT_TYPE_LABELS[type]}
    </SelectItem>
  );
}

export function CustomerFormDialog({
  open,
  customer,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: CustomerFormDialogProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: getDefaultValues(customer),
  });
  const mode = customer ? 'edit' : 'create';

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(customer));
    }
  }, [form, open, customer]);

  const onFormSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset(getDefaultValues());
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo cliente' : 'Editar cliente'}</DialogTitle>
          <DialogDescription>
            Datos fiscales para la facturacion electronica (DIAN).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onFormSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de documento</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CUSTOMER_DOCUMENT_TYPES.map(renderDocumentTypeOption)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero de documento</FormLabel>
                    <FormControl>
                      <Input placeholder="900123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nombre o razon social</FormLabel>
                    <FormControl>
                      <Input placeholder="Distribuidora La 80 SAS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="facturacion@empresa.co" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input placeholder="3001234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="municipality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Municipio</FormLabel>
                    <FormControl>
                      <Input placeholder="Medellin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxResponsibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsabilidad tributaria</FormLabel>
                    <FormControl>
                      <Input placeholder="Responsable de IVA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Direccion</FormLabel>
                    <FormControl>
                      <Input placeholder="Carrera 7 #18-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-3 md:col-span-2">
                    <div>
                      <FormLabel>Activo</FormLabel>
                      <FormDescription>Disponible para facturar.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="bg-background"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {mode === 'create' ? 'Crear cliente' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
