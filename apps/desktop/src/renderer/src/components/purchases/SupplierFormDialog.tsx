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
import {
  DOCUMENT_TYPE_LABEL,
  DOCUMENT_TYPES_BY_PERSON,
  computeNitVerificationDigit,
  isNumericDocument,
  requiresVerificationDigit,
  type PersonType,
} from '@/lib/co-document';
import { supplierFormSchema, type SupplierFormValues } from '@/schemas/suppliers';

interface SupplierFormDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
}

const DEFAULT_VALUES: SupplierFormValues = {
  name: '',
  personType: 'JURIDICA',
  documentType: 'NIT',
  documentNumber: '',
  verificationDigit: '',
  email: '',
  phone: '',
  address: '',
};

export function SupplierFormDialog({
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: SupplierFormDialogProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES);
    }
  }, [form, open]);

  const onFormSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset(DEFAULT_VALUES);
    onOpenChange(false);
  });

  const personType = form.watch('personType');
  const documentType = form.watch('documentType');
  const verificationDigit = form.watch('verificationDigit') ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo proveedor</DialogTitle>
          <DialogDescription>
            Este proveedor quedara disponible para registrar compras reales.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onFormSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input data-cy="supplier-name" placeholder="Carnes El Novillo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="personType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de persona</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue(
                            'documentType',
                            DOCUMENT_TYPES_BY_PERSON[value as PersonType][0],
                          );
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full" data-cy="supplier-person-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="JURIDICA">Persona jurídica</SelectItem>
                          <SelectItem value="NATURAL">Persona natural</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de documento</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full" data-cy="supplier-document-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DOCUMENT_TYPES_BY_PERSON[personType].map((dt) => (
                            <SelectItem key={dt} value={dt}>
                              {DOCUMENT_TYPE_LABEL[dt]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{DOCUMENT_TYPE_LABEL[documentType]}</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            data-cy="supplier-document"
                            inputMode={isNumericDocument(documentType) ? 'numeric' : 'text'}
                            placeholder={
                              documentType === 'NIT'
                                ? '900123456'
                                : documentType === 'PAS'
                                  ? 'AB123456'
                                  : '1098765432'
                            }
                            value={field.value ?? ''}
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            onChange={(event) => {
                              const next = isNumericDocument(documentType)
                                ? event.target.value.replace(/\D/g, '')
                                : event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                              field.onChange(next);
                              if (documentType === 'NIT') {
                                form.setValue(
                                  'verificationDigit',
                                  computeNitVerificationDigit(next) ?? '',
                                );
                              }
                            }}
                          />
                        </FormControl>
                        {requiresVerificationDigit(documentType) ? (
                          <div
                            className="flex shrink-0 flex-col items-center gap-1"
                            title="Dígito de verificación (editable)"
                          >
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              DV
                            </span>
                            <Input
                              data-cy="supplier-document-dv"
                              className="nums h-9 w-12 text-center text-sm font-bold"
                              inputMode="numeric"
                              maxLength={1}
                              value={verificationDigit}
                              onChange={(event) =>
                                form.setValue(
                                  'verificationDigit',
                                  event.target.value.replace(/\D/g, '').slice(0, 1),
                                  { shouldValidate: true },
                                )
                              }
                            />
                          </div>
                        ) : null}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        data-cy="supplier-email"
                        placeholder="compras@proveedor.co"
                        {...field}
                      />
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
                      <Input data-cy="supplier-phone" placeholder="3001234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direccion</FormLabel>
                    <FormControl>
                      <Input data-cy="supplier-address" placeholder="Cra. 45 #32-18" {...field} />
                    </FormControl>
                    <FormMessage />
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
              <Button type="submit" data-cy="supplier-submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Crear proveedor
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
