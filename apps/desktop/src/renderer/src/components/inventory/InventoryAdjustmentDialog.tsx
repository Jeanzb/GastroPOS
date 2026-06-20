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
import { Textarea } from '@/components/ui/textarea';
import {
  inventoryAdjustmentFormSchema,
  type InventoryAdjustmentFormInput,
  type InventoryAdjustmentFormValues,
} from '@/schemas/inventory';
import type { InventoryItemDto } from '@/types/inventory';

interface InventoryAdjustmentDialogProps {
  item: InventoryItemDto | null;
  isSubmitting: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InventoryAdjustmentFormValues) => Promise<void>;
}

const defaultValues: InventoryAdjustmentFormInput = {
  type: 'IN',
  quantity: 1,
  reason: '',
  unitCost: 0,
};

export function InventoryAdjustmentDialog({
  item,
  isSubmitting,
  open,
  onOpenChange,
  onSubmit,
}: InventoryAdjustmentDialogProps) {
  const form = useForm<InventoryAdjustmentFormInput, unknown, InventoryAdjustmentFormValues>({
    resolver: zodResolver(inventoryAdjustmentFormSchema),
    defaultValues,
  });
  const adjustmentType = form.watch('type');

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [form, open, item?.id]);

  const onFormSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset(defaultValues);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-cy="inventory-adjust-dialog">
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            {item ? `${item.name} · Stock actual ${item.stockOnHand} ${item.baseUnitCode}` : ''}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onFormSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de ajuste</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full" data-cy="inventory-adjust-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="IN">Entrada</SelectItem>
                      <SelectItem value="OUT">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad</FormLabel>
                    <FormControl>
                      <Input
                        data-cy="inventory-adjust-quantity"
                        type="number"
                        min={1}
                        step={1}
                        value={field.value}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo unitario</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        disabled={adjustmentType === 'OUT'}
                        data-cy="inventory-adjust-unit-cost"
                        value={field.value}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea
                      data-cy="inventory-adjust-reason"
                      placeholder="Conteo fisico, merma o correccion operativa"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !item} data-cy="inventory-adjust-submit">
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Registrar ajuste
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
