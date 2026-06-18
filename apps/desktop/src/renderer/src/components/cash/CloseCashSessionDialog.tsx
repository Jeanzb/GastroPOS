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
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/lib';
import { closeCashSessionSchema, type CloseCashSessionFormValues } from '@/schemas/cash';

interface CloseCashSessionDialogProps {
  open: boolean;
  expectedAmount: number;
  currency: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CloseCashSessionFormValues) => Promise<void>;
}

function getDefaultValues(expectedAmount: number): CloseCashSessionFormValues {
  return {
    countedAmount: expectedAmount,
    notes: '',
  };
}

export function CloseCashSessionDialog({
  open,
  expectedAmount,
  currency,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: CloseCashSessionDialogProps) {
  const form = useForm<CloseCashSessionFormValues>({
    resolver: zodResolver(closeCashSessionSchema),
    defaultValues: getDefaultValues(expectedAmount),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(expectedAmount));
    }
  }, [expectedAmount, form, open]);

  const countedAmount = form.watch('countedAmount');
  const difference = countedAmount - expectedAmount;

  const onFormSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar caja</DialogTitle>
          <DialogDescription>Confirma el conteo real antes de cerrar el turno.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onFormSubmit} className="space-y-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">Esperado</p>
              <p className="nums mt-1 text-2xl font-semibold">
                {formatMoney(expectedAmount, currency)}
              </p>
              <p className="nums mt-2 text-sm text-muted-foreground">
                Diferencia: {formatMoney(difference, currency)}
              </p>
            </div>

            <FormField
              control={form.control}
              name="countedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Efectivo contado</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={field.value}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas de cierre</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Explica diferencias si existen" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Cerrar caja
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
