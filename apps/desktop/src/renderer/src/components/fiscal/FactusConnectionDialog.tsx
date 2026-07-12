import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { factusConnectionFormSchema, type FactusConnectionFormValues } from '@/schemas/fiscal';
import type { FactusConnectionDto, UpsertFactusConnectionPayload } from '@/types/fiscal';

interface FactusConnectionDialogProps {
  open: boolean;
  connection: FactusConnectionDto | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: UpsertFactusConnectionPayload) => Promise<void>;
}

function defaults(connection: FactusConnectionDto | null): FactusConnectionFormValues {
  return {
    environment: connection?.environment ?? 'SANDBOX',
    baseUrl: connection?.baseUrl ?? '',
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
  };
}

export function FactusConnectionDialog({
  open,
  connection,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: FactusConnectionDialogProps) {
  const form = useForm<FactusConnectionFormValues>({
    resolver: zodResolver(factusConnectionFormSchema),
    defaultValues: defaults(connection),
  });

  useEffect(() => {
    if (open) form.reset(defaults(connection));
  }, [connection, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Conexion Factus</DialogTitle>
          <DialogDescription>
            Las credenciales se cifran en el backend del restaurante y no se exponen en esta app.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit({ ...values, baseUrl: values.baseUrl || undefined });
              onOpenChange(false);
            })}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ambiente</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="SANDBOX">Sandbox</SelectItem>
                        <SelectItem value="PRODUCTION">Produccion</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="baseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL API</FormLabel>
                    <FormControl><Input placeholder="URL oficial del ambiente" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem><FormLabel>Client ID</FormLabel><FormControl><Input autoComplete="off" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="clientSecret" render={({ field }) => (
                <FormItem><FormLabel>Client secret</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem><FormLabel>Usuario Factus</FormLabel><FormControl><Input type="email" autoComplete="off" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Contrasena Factus</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Guardar conexion
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
