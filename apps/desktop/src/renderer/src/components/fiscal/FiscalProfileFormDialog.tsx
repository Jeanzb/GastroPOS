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
import { fiscalProfileFormSchema, type FiscalProfileFormValues } from '@/schemas/fiscal';
import type { FiscalProfileDto } from '@/types/fiscal';

interface FiscalProfileFormDialogProps {
  open: boolean;
  profile: FiscalProfileDto | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FiscalProfileFormValues) => Promise<void>;
}

function getDefaultValues(profile: FiscalProfileDto | null): FiscalProfileFormValues {
  return {
    legalName: profile?.legalName ?? '',
    nit: profile?.nit ?? '',
    taxRegime: profile?.taxRegime ?? '',
    fiscalResponsibilities: profile?.fiscalResponsibilities.join(', ') ?? '',
    municipality: profile?.municipality ?? '',
    address: profile?.address ?? '',
    invoiceResolutionNumber: profile?.invoiceResolutionNumber ?? '',
    invoiceResolutionPrefix: profile?.invoiceResolutionPrefix ?? '',
    numberingRangeFrom: profile?.numberingRangeFrom ?? undefined,
    numberingRangeTo: profile?.numberingRangeTo ?? undefined,
    numberingValidFrom: toDateInput(profile?.numberingValidFrom),
    numberingValidUntil: toDateInput(profile?.numberingValidUntil),
    numberingRangeId: profile?.numberingRangeId ?? undefined,
    creditNoteNumberingRangeId: profile?.creditNoteNumberingRangeId ?? undefined,
  };
}

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function parseOptionalNumber(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

export function FiscalProfileFormDialog({
  open,
  profile,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: FiscalProfileFormDialogProps) {
  const form = useForm<FiscalProfileFormValues>({
    resolver: zodResolver(fiscalProfileFormSchema),
    defaultValues: getDefaultValues(profile),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(profile));
    }
  }, [form, open, profile]);

  const onFormSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] min-w-0 max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="min-w-0">
          <DialogTitle>Configurar perfil fiscal</DialogTitle>
          <DialogDescription>
            Guarda los datos tributarios y las resoluciones DIAN de este restaurante.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onFormSubmit} className="min-w-0 space-y-6">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razon social</FormLabel>
                    <FormControl>
                      <Input placeholder="Restaurante GastroIA S.A.S." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIT</FormLabel>
                    <FormControl>
                      <Input placeholder="900123456-7" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxRegime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regimen tributario</FormLabel>
                    <FormControl>
                      <Input placeholder="Responsable de IVA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fiscalResponsibilities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsabilidades fiscales</FormLabel>
                    <FormControl>
                      <Input placeholder="O-13, O-15" {...field} />
                    </FormControl>
                    <FormDescription>Separadas por coma.</FormDescription>
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
                      <Input placeholder="Bogota D.C." {...field} />
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
                      <Input placeholder="Cra 7 # 12-34" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid min-w-0 gap-4 rounded-lg border border-border bg-background p-4 md:grid-cols-4">
              <FormField
                control={form.control}
                name="invoiceResolutionNumber"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Resolucion</FormLabel>
                    <FormControl>
                      <Input placeholder="18764000000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceResolutionPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prefijo</FormLabel>
                    <FormControl>
                      <Input placeholder="SETP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberingRangeFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desde</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(parseOptionalNumber(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberingRangeTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasta</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(parseOptionalNumber(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberingValidFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vigente desde</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberingValidUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vigente hasta</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberingRangeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID del rango de factura</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(parseOptionalNumber(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Identificador del rango autorizado para factura de venta.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creditNoteNumberingRangeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID rango nota credito</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(parseOptionalNumber(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Necesario para correcciones posteriores a la emision.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="min-w-0">
              <Button
                type="button"
                variant="outline"
                className="w-full bg-background sm:w-auto"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar perfil fiscal
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
