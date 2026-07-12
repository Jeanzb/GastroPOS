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
import {
  PrintTicket,
  TicketDivider,
  TicketHeader,
  TicketRow,
} from '@/components/print/PrintTicket';
import { useActiveBranch } from '@/hooks/tenancy';
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

const FACTUS_PAYMENT_LABELS = {
  '10': 'Efectivo',
  '47': 'Transferencia',
  '49': 'Tarjeta debito',
  '48': 'Tarjeta credito',
  ZZZ: 'Otro',
} as const;

type FactusPaymentMethodCode = keyof typeof FACTUS_PAYMENT_LABELS;

function defaultFactusPaymentCode(method: TablePaymentMethod): FactusPaymentMethodCode {
  if (method === 'CASH') {
    return '10';
  }
  if (method === 'TRANSFER') {
    return '47';
  }
  if (method === 'CARD') {
    return '49';
  }
  return 'ZZZ';
}

export function CommandDialog({
  command,
  open,
  onOpenChange,
}: {
  command: KitchenCommandDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const branch = useActiveBranch();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && command ? (
        <PrintTicket>
          <TicketHeader
            branchName={branch?.name}
            title={`Comanda mesa ${command.tableNumber}`}
            lines={[
              command.waiterName ? `Mesero: ${command.waiterName}` : null,
              new Date(command.createdAt).toLocaleString('es-CO'),
            ]}
          />
          <TicketDivider />
          {command.items.map((item) => (
            <TicketRow key={item.id} label={item.name} value={`x${item.quantity}`} />
          ))}
          <TicketDivider />
          <TicketRow strong label="Total unidades" value={command.totalItems} />
        </PrintTicket>
      ) : null}
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md" data-cy="pos-command-dialog">
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
          <Button type="button" variant="outline" className="min-h-11" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button type="button" className="min-h-11" onClick={() => onOpenChange(false)}>
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
  const branch = useActiveBranch();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && receipt ? (
        <PrintTicket>
          <TicketHeader
            branchName={branch?.name}
            title={`Recibo mesa ${receipt.tableNumber}`}
            lines={[
              new Date(receipt.closedAt ?? Date.now()).toLocaleString('es-CO'),
              `Venta ${receipt.saleId.slice(-8).toUpperCase()}`,
            ]}
          />
          <TicketDivider />
          {receipt.items.map((item) => (
            <div key={item.id} className="print-ticket-block">
              <TicketRow
                label={item.name}
                value={formatMoney(item.lineTotal, receipt.currency)}
              />
              <p className="print-ticket-meta">
                {item.quantity} x {formatMoney(item.unitPriceAmount, receipt.currency)}
              </p>
            </div>
          ))}
          <TicketDivider />
          <TicketRow label="Subtotal" value={formatMoney(receipt.subtotal, receipt.currency)} />
          {receipt.discountTotal > 0 ? (
            <TicketRow
              label="Descuentos"
              value={`-${formatMoney(receipt.discountTotal, receipt.currency)}`}
            />
          ) : null}
          <TicketRow label="Impuestos" value={formatMoney(receipt.taxTotal, receipt.currency)} />
          <TicketRow strong label="Total" value={formatMoney(receipt.total, receipt.currency)} />
          {receipt.paymentMethod ? (
            <TicketRow label="Pago" value={PAYMENT_LABELS[receipt.paymentMethod]} />
          ) : null}
          {receipt.invoice ? (
            <>
              <TicketDivider />
              <div className="print-ticket-block">
                <TicketRow strong label="Factura electronica" value="" />
                <TicketRow label="Cliente" value={receipt.invoice.customerName} />
                <TicketRow
                  label="Borrador"
                  value={receipt.invoice.id.slice(-8).toUpperCase()}
                />
                {/* Bloque DIAN: NIT, resolucion, CUFE y QR se imprimen aqui
                    cuando el facturador emita el documento definitivo. */}
                <p className="print-ticket-meta">CUFE: pendiente de emision DIAN</p>
              </div>
            </>
          ) : null}
          <p className="print-ticket-note">
            {receipt.invoice
              ? 'Representacion en tramite ante DIAN.'
              : 'Documento no fiscal. No es factura electronica de venta.'}
          </p>
        </PrintTicket>
      ) : null}
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md" data-cy="pos-receipt-dialog">
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
          <Button type="button" variant="outline" className="min-h-11" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button type="button" className="min-h-11" onClick={() => onOpenChange(false)}>
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
      method: 'CASH',
      factusPaymentMethodCode: '10',
      amount: account?.balanceDue ?? 0,
      reference: '',
      fiscalRecipient: 'CONSUMER_FINAL',
      customer: undefined,
    },
  });
  const fiscalRecipient = form.watch('fiscalRecipient');
  const paymentMethod = form.watch('method');

  useEffect(() => {
    if (open) {
      form.reset({
        method: 'CASH',
        factusPaymentMethodCode: '10',
        amount: account?.balanceDue ?? 0,
        reference: '',
        fiscalRecipient: 'CONSUMER_FINAL',
        customer: undefined,
      });
    }
  }, [account?.balanceDue, form, open]);

  useEffect(() => {
    form.setValue('factusPaymentMethodCode', defaultFactusPaymentCode(paymentMethod));
  }, [form, paymentMethod]);

  useEffect(() => {
    if (fiscalRecipient === 'IDENTIFIED' && !form.getValues('customer')) {
      form.setValue('customer', {
        documentType: 'CC',
        documentNumber: '',
        dv: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        municipality: '',
        municipalityCode: '',
        countryCode: 'CO',
        taxResponsibility: '',
      });
    }
    if (fiscalRecipient === 'CONSUMER_FINAL') {
      form.setValue('customer', undefined);
    }
  }, [form, fiscalRecipient]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl" data-cy="pos-charge-dialog">
        <DialogHeader>
          <DialogTitle>Cobrar mesa {account?.tableNumber}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
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
                name="factusPaymentMethodCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metodo fiscal</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(FACTUS_PAYMENT_LABELS).map(([value, label]) => (
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
              name="fiscalRecipient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adquiriente fiscal</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-muted/30 p-1" role="radiogroup">
                      <Button
                        type="button"
                        size="sm"
                        variant={field.value === 'CONSUMER_FINAL' ? 'default' : 'ghost'}
                        role="radio"
                        aria-checked={field.value === 'CONSUMER_FINAL'}
                        onClick={() => field.onChange('CONSUMER_FINAL')}
                      >
                        Consumidor final
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={field.value === 'IDENTIFIED' ? 'default' : 'ghost'}
                        role="radio"
                        aria-checked={field.value === 'IDENTIFIED'}
                        onClick={() => field.onChange('IDENTIFIED')}
                      >
                        Cliente identificado
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fiscalRecipient === 'IDENTIFIED' ? (
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
                {form.watch('customer.documentType') === 'NIT' ? (
                  <FormField
                    control={form.control}
                    name="customer.dv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DV</FormLabel>
                        <FormControl>
                          <Input inputMode="numeric" maxLength={1} placeholder="7" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
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
                  name="customer.municipalityCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codigo municipio</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" placeholder="05001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Direccion</FormLabel>
                      <FormControl>
                        <Input placeholder="Carrera 7 # 18-24" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.taxResponsibility"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Responsabilidad tributaria</FormLabel>
                      <FormControl>
                        <Input placeholder="ZZ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="min-h-11"
                disabled={isSubmitting}
                data-cy="pos-charge-submit"
              >
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
