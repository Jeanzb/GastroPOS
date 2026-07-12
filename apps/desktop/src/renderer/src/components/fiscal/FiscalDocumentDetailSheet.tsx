import { useState } from 'react';
import type {
  CreateFiscalCreditNotePayload,
  FiscalDocumentDetailDto,
  FiscalDocumentDto,
} from '@gastroai/contracts';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  FileMinus2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  TimerReset,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useFiscalDocument } from '@/hooks/fiscal';
import { formatDateTime, formatMoney } from '@/lib';
import {
  FISCAL_DOCUMENT_STATUS_LABELS,
  fiscalDocumentStatusTone,
  isFiscalDocumentRetriable,
} from './fiscal-ui';
import { CreditNoteDialog } from './CreditNoteDialog';

interface FiscalDocumentDetailSheetProps {
  document: FiscalDocumentDto | null;
  open: boolean;
  isRetrying: boolean;
  isDownloading: boolean;
  isCreatingCreditNote: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: (document: FiscalDocumentDto) => void;
  onDownload: (document: FiscalDocumentDto) => void;
  onCreateCreditNote: (
    document: FiscalDocumentDetailDto,
    payload: CreateFiscalCreditNotePayload,
  ) => Promise<void>;
}

export function FiscalDocumentDetailSheet({
  document,
  open,
  isRetrying,
  isDownloading,
  isCreatingCreditNote,
  onOpenChange,
  onRetry,
  onDownload,
  onCreateCreditNote,
}: FiscalDocumentDetailSheetProps) {
  const detailQuery = useFiscalDocument(open ? (document?.id ?? null) : null);
  const detail = detailQuery.data;
  const currentDocument = detail ?? document;
  const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setIsCreditNoteOpen(false);
        }
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-l border-border bg-surface-raised p-0 sm:max-w-xl"
        data-cy="fiscal-document-detail"
      >
        <SheetHeader className="border-b border-border px-5 pt-6 pb-5 sm:px-6">
          <div className="flex min-w-0 items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <SheetTitle className="truncate">{documentNumber(currentDocument)}</SheetTitle>
              <SheetDescription className="mt-1.5">
                {currentDocument?.customerName ?? 'Documento fiscal'}
              </SheetDescription>
            </div>
            {currentDocument ? (
              <StatusPill
                className="fiscal-status-pop shrink-0"
                tone={fiscalDocumentStatusTone(currentDocument.status)}
              >
                {FISCAL_DOCUMENT_STATUS_LABELS[currentDocument.status]}
              </StatusPill>
            ) : null}
          </div>
        </SheetHeader>

        {detailQuery.isLoading ? <DetailSkeleton /> : null}
        {detailQuery.isError ? <DetailError /> : null}
        {detail ? <DetailContent detail={detail} /> : null}

        {currentDocument ? (
          <SheetFooter className="sticky bottom-0 mt-0 border-t border-border bg-surface-raised px-5 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              disabled={isDownloading || !currentDocument.factusNumber}
              title="Solicitar descarga de evidencias"
              aria-label="Solicitar descarga de evidencias"
              onClick={() => onDownload(currentDocument)}
            >
              {isDownloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Evidencias
            </Button>
            {isFiscalDocumentRetriable(currentDocument.status) ? (
              <Button
                type="button"
                disabled={isRetrying}
                title="Reintentar documento de forma individual"
                onClick={() => onRetry(currentDocument)}
              >
                {isRetrying ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Reintentar
              </Button>
            ) : null}
            {detail && isCreditNoteEligible(detail) ? (
              <Button
                type="button"
                variant="outline"
                disabled={isCreatingCreditNote}
                onClick={() => setIsCreditNoteOpen(true)}
                data-cy="fiscal-create-credit-note"
              >
                <FileMinus2 className="size-4" />
                Nota credito
              </Button>
            ) : null}
          </SheetFooter>
        ) : null}
      </SheetContent>
      {detail ? (
        <CreditNoteDialog
          open={isCreditNoteOpen}
          detail={detail}
          isSubmitting={isCreatingCreditNote}
          onOpenChange={setIsCreditNoteOpen}
          onSubmit={(payload) => onCreateCreditNote(detail, payload)}
        />
      ) : null}
    </Sheet>
  );
}

function DetailContent({ detail }: { detail: FiscalDocumentDetailDto }) {
  return (
    <div className="min-w-0 divide-y divide-border">
      {detail.lastErrorCode ? (
        <section className="px-5 py-4 sm:px-6">
          <div className="flex gap-3 rounded-lg border border-destructive/20 bg-danger-soft px-4 py-3 text-sm text-destructive">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">Accion requerida</p>
              <p className="mt-1 break-words text-xs leading-5">
                {fiscalErrorMessage(detail.lastErrorCode)}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-5 py-5 sm:px-6" aria-labelledby="fiscal-detail-summary">
        <SectionTitle id="fiscal-detail-summary" icon={FileText} title="Resumen fiscal" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailField label="Cliente" value={detail.customerName} />
          <DetailField
            label="Identificacion"
            value={detail.customerDocumentNumber ?? 'Consumidor final'}
            mono
          />
          <DetailField label="Sucursal" value={detail.branchName ?? 'Sin sede'} />
          <DetailField label="Emitido" value={formatDateTime(detail.createdAt)} />
          <DetailField label="Referencia" value={detail.referenceCode ?? 'Sin referencia'} mono />
          <DetailField label="Numero fiscal" value={detail.factusNumber ?? 'Pendiente'} mono />
        </div>
        {detail.cufe || detail.cude ? (
          <div className="mt-3 rounded-lg border border-border bg-surface-quiet/60 p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              {detail.cude ? 'CUDE' : 'CUFE'}
            </p>
            <p className="nums mt-1 break-all text-xs leading-5">{detail.cude ?? detail.cufe}</p>
          </div>
        ) : null}
        {detail.publicUrl ? (
          <a
            href={detail.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="motion-press mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Ver representacion publica
            <ExternalLink className="size-4" />
          </a>
        ) : null}
      </section>

      <section className="px-5 py-5 sm:px-6" aria-labelledby="fiscal-detail-totals">
        <SectionTitle id="fiscal-detail-totals" icon={CheckCircle2} title="Totales e impuestos" />
        <div className="mt-4 space-y-2 text-sm">
          <MoneyRow label="Subtotal" value={detail.subtotalAmount} currency={detail.currency} />
          <MoneyRow label="Descuentos" value={detail.discountAmount} currency={detail.currency} />
          <MoneyRow label="Impuestos" value={detail.taxAmount} currency={detail.currency} />
          <MoneyRow strong label="Total" value={detail.totalAmount} currency={detail.currency} />
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[440px] text-left text-xs">
            <thead className="bg-muted/55 text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Impuesto</th>
                <th className="px-3 py-2.5 text-right font-semibold">Base</th>
                <th className="px-3 py-2.5 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {detail.taxes.map((tax) => (
                <tr key={tax.id} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{tax.taxName}</span>
                    <span className="nums ml-1 text-muted-foreground">{tax.factusTaxCode}</span>
                  </td>
                  <td className="nums px-3 py-2.5 text-right">
                    {formatMoney(tax.taxableAmount, detail.currency)}
                  </td>
                  <td className="nums px-3 py-2.5 text-right">
                    {formatMoney(tax.taxAmount, detail.currency)}
                  </td>
                </tr>
              ))}
              {detail.taxes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                    Sin impuestos registrados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="px-5 py-5 sm:px-6" aria-labelledby="fiscal-detail-credit-notes">
        <SectionTitle id="fiscal-detail-credit-notes" icon={FileMinus2} title="Notas credito" />
        <div className="mt-4 space-y-2">
          {detail.creditNotes.map((creditNote) => (
            <div
              key={creditNote.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3"
            >
              <div className="min-w-0">
                <p className="nums truncate text-xs font-semibold">
                  {creditNote.factusNumber ?? creditNote.referenceCode}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Concepto {creditNote.correctionConceptCode} -{' '}
                  {formatDateTime(creditNote.createdAt)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <StatusPill
                  className="fiscal-status-pop"
                  tone={fiscalDocumentStatusTone(creditNote.status)}
                >
                  {FISCAL_DOCUMENT_STATUS_LABELS[creditNote.status]}
                </StatusPill>
                <p className="nums mt-1 text-xs font-semibold">
                  {formatMoney(creditNote.amount, creditNote.currency)}
                </p>
              </div>
            </div>
          ))}
          {detail.creditNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay notas credito asociadas.</p>
          ) : null}
        </div>
      </section>

      <section className="px-5 py-5 sm:px-6" aria-labelledby="fiscal-detail-timeline">
        <SectionTitle id="fiscal-detail-timeline" icon={TimerReset} title="Trazabilidad" />
        <ol className="mt-4 space-y-0">
          {detail.events.map((event, index) => (
            <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
              <span className="relative z-10 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-[10px] font-bold text-muted-foreground">
                {index + 1}
              </span>
              {index < detail.events.length - 1 ? (
                <span className="absolute top-5 left-2.5 h-[calc(100%-16px)] w-px bg-border" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{event.message ?? event.type}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(event.createdAt)}
                </p>
              </div>
            </li>
          ))}
          {detail.events.length === 0 ? (
            <li className="text-sm text-muted-foreground">No hay eventos registrados todavia.</li>
          ) : null}
        </ol>
      </section>

      <section className="px-5 py-5 sm:px-6" aria-labelledby="fiscal-detail-evidence">
        <SectionTitle id="fiscal-detail-evidence" icon={Download} title="Evidencias y respuestas" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <EvidenceState label="PDF" available={detail.hasPdf} />
          <EvidenceState label="XML" available={detail.hasXml} />
          <EvidenceState label="XML adjunto" available={detail.hasAttachedDocumentXml} />
        </div>
        <div className="mt-4 space-y-2">
          {detail.responses.map((response) => (
            <div
              key={response.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="nums truncate text-xs font-semibold">Respuesta fiscal</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Intento {response.attempt} - {formatDateTime(response.createdAt)}
                </p>
              </div>
              <span className="nums shrink-0 text-xs font-semibold text-muted-foreground">
                {response.httpStatus ?? 'Sin HTTP'}
              </span>
            </div>
          ))}
          {detail.responses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavia no hay respuestas del servicio fiscal.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function isCreditNoteEligible(detail: FiscalDocumentDetailDto): boolean {
  return (
    detail.isValidated &&
    ['ACCEPTED', 'ACCEPTED_BY_DIAN', 'CORRECTED_WITH_CREDIT_NOTE', 'PARTIALLY_REFUNDED'].includes(
      detail.status,
    ) &&
    detail.lines.some((line) => line.remainingCreditQuantity > 0)
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5 px-5 py-6 sm:px-6">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-52 w-full" />
    </div>
  );
}

function DetailError() {
  return (
    <div className="px-5 py-6 sm:px-6">
      <div className="rounded-lg border border-destructive/20 bg-danger-soft p-4 text-sm text-destructive">
        No se pudo cargar el detalle fiscal. Cierra e intenta abrir el documento de nuevo.
      </div>
    </div>
  );
}

function SectionTitle({ id, icon: Icon, title }: { id: string; icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-orange" />
      <h3 id={id} className="text-sm font-semibold">
        {title}
      </h3>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 truncate text-sm font-semibold ${mono ? 'nums text-xs' : ''}`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  currency,
  strong = false,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${strong ? 'border-t border-dashed border-border pt-3 font-bold' : ''}`}
    >
      <span>{label}</span>
      <span className="nums">{formatMoney(value, currency)}</span>
    </div>
  );
}

function EvidenceState({ label, available }: { label: string; available: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-sm ${available ? 'border-success/20 bg-success-soft/50 text-success' : 'border-border bg-muted/40 text-muted-foreground'}`}
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-xs">{available ? 'Disponible' : 'Pendiente'}</p>
    </div>
  );
}

function documentNumber(document: FiscalDocumentDto | null): string {
  if (!document) {
    return 'Detalle fiscal';
  }
  return (
    document.factusNumber ??
    document.referenceCode ??
    `${document.prefix ?? 'FE'}-${document.number ?? document.id.slice(-6).toUpperCase()}`
  );
}

function fiscalErrorMessage(code: string): string {
  if (code.startsWith('FACTUS_')) {
    return 'El servicio fiscal reporto un error tecnico. Revisa el estado y reintenta cuando corresponda.';
  }
  if (code.startsWith('FISCAL_')) {
    return 'El documento requiere una revision de configuracion o de sus datos fiscales.';
  }
  return code;
}
