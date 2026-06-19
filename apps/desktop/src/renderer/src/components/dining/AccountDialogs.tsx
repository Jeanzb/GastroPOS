import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Printer } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { MoneyInput } from '@/components/ui/money-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { formatMoney } from '@/lib/format';
import {
  chargeTableAccountSchema,
  type ChargeTableAccountValues,
} from '@/schemas/dining';
import type {
  KitchenCommandDto,
  ReceiptDto,
  TableAccountDto,
  TablePaymentMethod,
} from '@/types/dining';

export const PAYMENT_LABELS: Record<TablePaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

export function CommandDialog({
  command,
  open,
  onOpenChange,
}: {
  command: KitchenCommandDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-cy="pos-command-dialog">
        <DialogHeader>
          <DialogTitle>Comanda mesa {command?.tableNumber}</DialogTitle>
        </DialogHeader>
        {command ? (
          <div className="space-y-4 rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between text-sm">
              <span>{command.waiterName ?? 'Sin mesero'}</span>
              <span className="nums">{new Date(command.createdAt).toLocaleTimeString('es-CO')}</span>
            </div>
            <div className="space-y-2">
              {command.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 text-sm">
                  <span>{item.name}</span>
                  <span className="nums font-bold">x{item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 text-sm font-semibold">
              Total unidades: {command.totalItems}
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReceiptDialog({
  receipt,
  open,
  onOpenChange,
}: {
  receipt: ReceiptDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-cy="pos-receipt-dialog">
        <DialogHeader>
          <DialogTitle>Recibo mesa {receipt?.tableNumber}</DialogTitle>
        </DialogHeader>
        {receipt ? (
          <div className="space-y-4 rounded-lg border border-border bg-background p-4">
            <div className="space-y-2">
              {receipt.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
                  <span>
                    {item.name}
                    <span className="nums block text-xs text-muted-foreground">
                      {item.quantity} x {formatMoney(item.unitPriceAmount, receipt.currency)}
                    </span>
                  </span>
                  <span className="nums font-semibold">
                    {formatMoney(item.lineTotal, receipt.currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="nums">{formatMoney(receipt.subtotal, receipt.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos</span>
                <span className="nums">{formatMoney(receipt.taxTotal, receipt.currency)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="nums">{formatMoney(receipt.total, receipt.currency)}</span>
              </div>
              {receipt.paymentMethod ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>Pago</span>
                  <span>{PAYMENT_LABELS[receipt.paymentMethod]}</span>
                </div>
              ) : null}
              {receipt.invoice ? (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Factura electronica en borrador: {receipt.invoice.status}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChargeDialog({
  account,
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  account: TableAccountDto | null | undefined;
  open: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ChargeTableAccountValues) => Promise<void>;
}) {
  const form = useForm<ChargeTableAccountValues>({
    resolver: zodResolver(chargeTableAccountSchema),
    defaultValues: {
      method: 'CARD',
      amount: account?.balanceDue ?? 0,
      reference: '',
      requiresInvoice: false,
      customer: undefined,
    },
  });
  const requiresInvoice = form.watch('requiresInvoice');

  useEffect(() => {
    if (open) {
      form.reset({
        method: 'CARD',
        amount: account?.balanceDue ?? 0,
        reference: '',
        requiresInvoice: false,
        customer: undefined,
      });
    }
  }, [account?.balanceDue, form, open]);

  useEffect(() => {
    if (requiresInvoice && !form.getValues('customer')) {
      form.setValue('customer', {
        documentType: 'CC',
        documentNumber: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        municipality: '',
        taxResponsibility: '',
      });
    }
    if (!requiresInvoice) {
      form.setValue('customer', undefined);
    }
  }, [form, requiresInvoice]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-cy="pos-charge-dialog">
        <DialogHeader>
          <DialogTitle>Cobrar mesa {account?.tableNumber}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medio de pago</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full" data-cy="pos-charge-method">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0"
                        data-cy="pos-charge-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia</FormLabel>
                    <FormControl>
                      <Input placeholder="Voucher o transferencia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="requiresInvoice"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div>
                    <FormLabel>Requiere factura electronica</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Se crea un borrador fiscal; el envio DIAN queda pendiente.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {requiresInvoice ? (
              <div className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customer.documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo documento</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {['CC', 'NIT', 'CE', 'PP', 'TI', 'NUIP', 'OTHER'].map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero</FormLabel>
                      <FormControl>
                        <Input placeholder="900123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre fiscal</FormLabel>
                      <FormControl>
                        <Input placeholder="Cliente facturacion" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="cliente@correo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.phone"
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
                  name="customer.municipality"
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
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} data-cy="pos-charge-submit">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Cobrar cuenta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
