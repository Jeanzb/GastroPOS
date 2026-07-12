import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateFiscalCreditNotePayload, FiscalDocumentDetailDto } from '@gastroai/contracts';
import { AlertTriangle, FileMinus2, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/lib';

const creditNoteSchema = z.object({
  correctionConceptCode: z.enum(['1', '2']),
  observation: z.string().trim().max(250, 'La observacion permite maximo 250 caracteres.'),
  lines: z.array(
    z.object({
      invoiceLineId: z.string().min(1),
      quantity: z.number().int().min(0),
    }),
  ),
});

type CreditNoteFormValues = z.infer<typeof creditNoteSchema>;

interface CreditNoteDialogProps {
  open: boolean;
  detail: FiscalDocumentDetailDto;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateFiscalCreditNotePayload) => Promise<void>;
}

export function CreditNoteDialog({
  open,
  detail,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: CreditNoteDialogProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const fullCancellationAvailable = detail.lines.every(
    (line) => line.creditedQuantity === 0 && line.remainingCreditQuantity === line.quantity,
  );
  const form = useForm<CreditNoteFormValues>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: formValues(detail, '1'),
  });
  const concept = form.watch('correctionConceptCode');
  const lineValues = form.watch('lines');

  useEffect(() => {
    if (open) {
      setIdempotencyKey(createIdempotencyKey());
      form.reset(formValues(detail, '1'));
    } else {
      setIsConfirmOpen(false);
    }
  }, [detail, form, open]);

  const selectedLines = useMemo(
    () =>
      detail.lines
        .map((line, index) => ({ line, quantity: lineValues[index]?.quantity ?? 0 }))
        .filter(({ quantity }) => quantity > 0),
    [detail.lines, lineValues],
  );
  const estimatedAmount = selectedLines.reduce(
    (total, { line, quantity }) => total + estimateLineAmount(line, quantity),
    0,
  );

  const setConcept = (value: '1' | '2') => {
    form.setValue('correctionConceptCode', value, { shouldValidate: true });
    if (value === '2') {
      detail.lines.forEach((line, index) => {
        form.setValue(`lines.${index}.quantity`, line.remainingCreditQuantity, {
          shouldValidate: true,
        });
      });
    }
  };

  const requestConfirmation = form.handleSubmit((values) => {
    const selected = values.lines.filter((line) => line.quantity > 0);
    if (selected.length === 0) {
      form.setError('root', { message: 'Selecciona al menos una cantidad para corregir.' });
      return;
    }
    for (const [index, line] of values.lines.entries()) {
      const maximum = detail.lines[index]?.remainingCreditQuantity ?? 0;
      if (line.quantity > maximum) {
        form.setError(`lines.${index}.quantity`, {
          message: `Maximo corregible: ${maximum}.`,
        });
        return;
      }
    }
    if (
      values.correctionConceptCode === '2' &&
      values.lines.some(
        (line, index) => line.quantity !== (detail.lines[index]?.remainingCreditQuantity ?? 0),
      )
    ) {
      form.setError('root', {
        message: 'La anulacion debe incluir todas las lineas y cantidades pendientes.',
      });
      return;
    }
    setIsConfirmOpen(true);
  });

  const submitCreditNote = async () => {
    const values = form.getValues();
    try {
      await onSubmit({
        idempotencyKey,
        correctionConceptCode: values.correctionConceptCode,
        observation: values.observation.trim() || undefined,
        lines: values.lines.filter((line) => line.quantity > 0),
      });
      setIsConfirmOpen(false);
      onOpenChange(false);
    } catch {
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl gap-0 overflow-hidden p-0"
          data-cy="fiscal-credit-note-dialog"
        >
          <DialogHeader className="border-b border-border px-5 pt-5 pb-4 sm:px-6">
            <DialogTitle>Emitir nota credito</DialogTitle>
            <DialogDescription>
              Corrige {documentReference(detail)} sin modificar la factura original.
            </DialogDescription>
          </DialogHeader>

          <form
            className="max-h-[calc(100dvh-14rem)] space-y-5 overflow-y-auto px-5 py-5 sm:px-6"
            onSubmit={requestConfirmation}
          >
            <div className="rounded-lg border border-warning/25 bg-warning-soft/60 px-4 py-3 text-sm text-amber-900">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  La factura emitida se conserva intacta. La correccion queda vinculada a esta nota
                  credito.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.55fr)]">
              <div className="space-y-2">
                <Label>Concepto de correccion</Label>
                <Select value={concept} onValueChange={(value) => setConcept(value as '1' | '2')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Devolucion parcial</SelectItem>
                    <SelectItem value="2" disabled={!fullCancellationAvailable}>
                      Anulacion completa
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {concept === '2'
                    ? 'Incluye el total de lineas pendientes de la factura.'
                    : 'Selecciona las unidades devueltas o no aceptadas.'}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface-quiet/55 px-4 py-3">
                <p className="text-xs text-muted-foreground">Total estimado</p>
                <p className="nums mt-1 text-lg font-bold">
                  {formatMoney(estimatedAmount, detail.currency)}
                </p>
              </div>
            </div>

            <section aria-labelledby="credit-note-lines-heading">
              <div className="flex items-baseline justify-between gap-4">
                <h3 id="credit-note-lines-heading" className="text-sm font-semibold">
                  Lineas a corregir
                </h3>
                <span className="text-xs text-muted-foreground">Cantidad pendiente</span>
              </div>
              <div className="mt-3 divide-y rounded-lg border border-border">
                {detail.lines.map((line, index) => {
                  const error = form.formState.errors.lines?.[index]?.quantity?.message;
                  return (
                    <div
                      key={line.id}
                      className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_92px_92px] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" title={line.description}>
                          {line.description}
                        </p>
                        <p className="nums mt-1 text-xs text-muted-foreground">
                          {formatMoney(line.totalAmount, detail.currency)} - {line.creditedQuantity}{' '}
                          corregidas
                        </p>
                      </div>
                      <p className="nums text-sm font-semibold sm:text-right">
                        {line.remainingCreditQuantity}
                      </p>
                      <div>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={line.remainingCreditQuantity}
                          disabled={line.remainingCreditQuantity === 0 || concept === '2'}
                          aria-label={`Cantidad a corregir de ${line.description}`}
                          aria-invalid={Boolean(error)}
                          {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                        />
                        {error ? (
                          <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="space-y-2">
              <Label htmlFor="credit-note-observation">Observacion</Label>
              <Textarea
                id="credit-note-observation"
                maxLength={250}
                placeholder="Motivo operativo de la correccion"
                {...form.register('observation')}
              />
              <p className="text-xs text-muted-foreground">
                {form.watch('observation').length}/250
              </p>
            </div>

            {form.formState.errors.root?.message ? (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.root.message}
              </p>
            ) : null}

            <DialogFooter className="border-t border-border pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || selectedLines.length === 0}>
                <FileMinus2 className="size-4" />
                Revisar nota credito
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar nota credito</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviara una correccion por {formatMoney(estimatedAmount, detail.currency)} para{' '}
              {selectedLines.length} linea(s). Esta accion crea una referencia fiscal inmutable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Volver</AlertDialogCancel>
            <AlertDialogAction disabled={isSubmitting} onClick={submitCreditNote}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileMinus2 className="size-4" />
              )}
              Encolar nota credito
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formValues(
  detail: FiscalDocumentDetailDto,
  correctionConceptCode: '1' | '2',
): CreditNoteFormValues {
  return {
    correctionConceptCode,
    observation: '',
    lines: detail.lines.map((line) => ({ invoiceLineId: line.id, quantity: 0 })),
  };
}

function estimateLineAmount(
  line: FiscalDocumentDetailDto['lines'][number],
  quantity: number,
): number {
  if (quantity >= line.remainingCreditQuantity) {
    return Math.round((line.totalAmount * line.remainingCreditQuantity) / line.quantity);
  }
  return Math.round((line.totalAmount * quantity) / line.quantity);
}

function createIdempotencyKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function documentReference(detail: FiscalDocumentDetailDto): string {
  return detail.factusNumber ?? detail.referenceCode ?? detail.id;
}
