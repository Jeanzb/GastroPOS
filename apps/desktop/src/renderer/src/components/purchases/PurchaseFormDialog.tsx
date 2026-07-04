import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
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
import { MoneyInput } from '@/components/ui/money-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/lib/format';
import { purchaseFormSchema, type PurchaseFormValues } from '@/schemas/purchases';
import type { SupplierDto } from '@/types/suppliers';

interface PurchaseFormDialogProps {
  open: boolean;
  suppliers: SupplierDto[];
  insumoNames?: string[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PurchaseFormValues) => Promise<void>;
}

const INSUMO_LIST_ID = 'purchase-insumo-options';

const EMPTY_ITEM = { name: '', quantity: 1, unitCost: 0 };

const DEFAULT_VALUES: PurchaseFormValues = {
  supplierId: '',
  reference: '',
  notes: '',
  taxTotal: 0,
  items: [{ ...EMPTY_ITEM }],
};

export function PurchaseFormDialog({
  open,
  suppliers,
  insumoNames = [],
  isSubmitting,
  onOpenChange,
  onSubmit,
}: PurchaseFormDialogProps) {
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

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

  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const watchedTax = useWatch({ control: form.control, name: 'taxTotal' });
  const subtotal = (watchedItems ?? []).reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.unitCost) || 0),
    0,
  );
  const tax = Number(watchedTax) || 0;
  const total = subtotal + tax;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nueva compra</DialogTitle>
          <DialogDescription>
            Registra la factura del proveedor con todos sus insumos.
          </DialogDescription>
        </DialogHeader>

        <datalist id={INSUMO_LIST_ID}>
          {insumoNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <Form {...form}>
          <form onSubmit={onFormSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Proveedor</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={suppliers.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full" data-cy="purchase-supplier-select">
                          <SelectValue placeholder="Selecciona proveedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {suppliers.length === 0 ? (
                      <FormDescription>Crea un proveedor antes de registrar la compra.</FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento</FormLabel>
                    <FormControl>
                      <Input data-cy="purchase-reference" placeholder="FC-2207" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impuestos</FormLabel>
                    <FormControl>
                      <MoneyInput
                        data-cy="purchase-tax-total"
                        placeholder="0"
                        value={field.value}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Insumos</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-cy="purchase-add-item"
                  onClick={() => append({ ...EMPTY_ITEM })}
                >
                  <Plus className="size-4" />
                  Agregar insumo
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border border-border">
                <div className="grid grid-cols-[1fr_72px_120px_110px_36px] items-center gap-2 border-b border-border bg-surface-quiet px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  <span>Insumo</span>
                  <span className="text-center">Cant.</span>
                  <span className="text-right">Costo unit.</span>
                  <span className="text-right">Subtotal</span>
                  <span />
                </div>

                {fields.map((row, index) => {
                  const line =
                    (Number(watchedItems?.[index]?.quantity) || 0) *
                    (Number(watchedItems?.[index]?.unitCost) || 0);
                  return (
                    <div
                      key={row.id}
                      data-cy="purchase-item-row"
                      className="grid grid-cols-[1fr_72px_120px_110px_36px] items-start gap-2 border-b border-[#F2ECE3] px-3 py-2 last:border-b-0"
                    >
                      <FormField
                        control={form.control}
                        name={`items.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                data-cy="purchase-item-name"
                                placeholder="Carne molida"
                                className="h-9"
                                list={INSUMO_LIST_ID}
                                autoComplete="off"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                className="h-9 text-center"
                                data-cy="purchase-item-quantity"
                                value={field.value}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                                onChange={(event) => field.onChange(Number(event.target.value))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitCost`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <MoneyInput
                                className="h-9 text-right"
                                data-cy="purchase-item-cost"
                                value={field.value}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                                onChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <span className="nums pt-2 text-right text-sm font-semibold">
                        {formatMoney(line, 'COP')}
                      </span>
                      <button
                        type="button"
                        aria-label="Quitar insumo"
                        data-cy="purchase-item-remove"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                        className="mt-1.5 grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-quiet hover:text-danger-strong disabled:opacity-40"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {form.formState.errors.items?.message ? (
                <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
              ) : null}
            </div>

            <div className="rounded-xl border border-border bg-surface-raised px-4 py-3">
              <div className="flex justify-between text-[13px] text-[#6B6359]">
                <span>Subtotal</span>
                <span className="nums font-semibold text-foreground">
                  {formatMoney(subtotal, 'COP')}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-[13px] text-[#6B6359]">
                <span>Impuestos</span>
                <span className="nums font-semibold text-foreground">{formatMoney(tax, 'COP')}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-[#D8D0C5] pt-2">
                <span className="font-display text-[15px] font-bold">Total</span>
                <span className="nums text-xl font-bold" data-cy="purchase-total">
                  {formatMoney(total, 'COP')}
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      data-cy="purchase-notes"
                      placeholder="Observaciones de recepcion o pago"
                      {...field}
                    />
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
              <Button
                type="submit"
                data-cy="purchase-submit"
                disabled={isSubmitting || suppliers.length === 0}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Registrar compra
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
