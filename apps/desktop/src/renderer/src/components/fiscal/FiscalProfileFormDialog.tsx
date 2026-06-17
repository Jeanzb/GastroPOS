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
  const provider = profile?.providerConfig;

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
    providerType: provider?.providerType ?? 'TECHNOLOGY_PROVIDER',
    providerName: provider?.providerName ?? '',
    environment: provider?.environment ?? 'TEST',
    endpointUrl: provider?.endpointUrl ?? '',
    softwareId: provider?.softwareId ?? '',
    certificateAlias: provider?.certificateAlias ?? '',
    accountId: provider?.accountId ?? '',
    apiKeyRef: provider?.apiKeyRef ?? '',
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Configurar perfil fiscal</DialogTitle>
          <DialogDescription>
            Guarda datos fiscales colombianos y referencias tecnicas del proveedor.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onFormSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
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

            <div className="grid gap-4 rounded-lg border border-border bg-background p-4 md:grid-cols-4">
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
            </div>

            <div className="grid gap-4 rounded-lg border border-border bg-background p-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="providerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de integracion</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TECHNOLOGY_PROVIDER">Proveedor tecnologico</SelectItem>
                        <SelectItem value="DIAN_DIRECT">DIAN directo</SelectItem>
                        <SelectItem value="API_PROVIDER">API fiscal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ambiente</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TEST">Pruebas</SelectItem>
                        <SelectItem value="PRODUCTION">Produccion</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="providerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del proveedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endpointUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endpoint</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="softwareId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Software ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Referencia DIAN/proveedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="certificateAlias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alias certificado</FormLabel>
                    <FormControl>
                      <Input placeholder="secret://certificados/dian" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuenta proveedor</FormLabel>
                    <FormControl>
                      <Input placeholder="acct_..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apiKeyRef"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Referencia API key</FormLabel>
                    <FormControl>
                      <Input placeholder="secret://fiscal/api-key" {...field} />
                    </FormControl>
                    <FormDescription>No guardes la clave real en el escritorio.</FormDescription>
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
              <Button type="submit" disabled={isSubmitting}>
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
