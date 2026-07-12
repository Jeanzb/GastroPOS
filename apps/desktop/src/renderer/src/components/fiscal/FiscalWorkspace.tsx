import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileText,
  Loader2,
  PlugZap,
  RefreshCw,
  Settings2,
} from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFiscalProfile } from '@/hooks/fiscal';
import { useActiveBranch } from '@/hooks/tenancy';
import { formatDate, formatMoney } from '@/lib';
import type {
  CreateFiscalCreditNotePayload,
  FiscalDocumentDto,
  FiscalInvoiceStatus,
  FiscalNumberingRangeDto,
  FiscalProfileDto,
  UpsertFiscalProfilePayload,
} from '@/types/fiscal';
import { useAppToast } from '@/hooks/ui';
import type { FiscalProfileFormValues } from '@/schemas/fiscal';
import { FiscalDocumentDetailSheet } from './FiscalDocumentDetailSheet';
import { FactusConnectionDialog } from './FactusConnectionDialog';
import { FiscalProfileFormDialog } from './FiscalProfileFormDialog';
import {
  FISCAL_DOCUMENT_STATUS_LABELS,
  fiscalDocumentStatusTone,
  isFiscalDocumentRetriable,
} from './fiscal-ui';

const ACCEPTED_STATUSES: FiscalInvoiceStatus[] = ['ACCEPTED', 'ACCEPTED_BY_DIAN'];

export function FiscalWorkspace() {
  const toast = useAppToast();
  const activeBranch = useActiveBranch();
  const fiscal = useFiscalProfile();
  const profile = fiscal.profileQuery.data ?? null;
  const connection = fiscal.connectionQuery.data ?? null;
  const branchConfiguration = fiscal.branchConfigurationQuery.data ?? null;
  const documents = fiscal.documentsQuery.data?.items ?? [];
  const ranges = fiscal.rangesQuery.data?.items ?? [];
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConnectionOpen, setIsConnectionOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<FiscalDocumentDto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const invoiceRanges = useMemo(() => ranges.filter((range) => range.document === '21'), [ranges]);
  const creditNoteRanges = useMemo(
    () => ranges.filter((range) => range.document === '22'),
    [ranges],
  );
  const acceptedCount = documents.filter((document) =>
    ACCEPTED_STATUSES.includes(document.status),
  ).length;
  const pendingCount = documents.filter((document) =>
    ['PENDING_VALIDATION', 'SENT_TO_PROVIDER', 'SENT'].includes(document.status),
  ).length;
  const rejectedCount = documents.filter((document) =>
    ['REJECTED', 'REJECTED_BY_DIAN', 'FAILED'].includes(document.status),
  ).length;

  const handleProfileSubmit = async (payload: UpsertFiscalProfilePayload) => {
    try {
      await fiscal.upsertMutation.mutateAsync(payload);
      toast.success(
        'Perfil DIAN actualizado',
        'Los datos tributarios quedaron guardados para el restaurante.',
      );
    } catch (error) {
      toast.error(
        'No se pudo guardar el perfil',
        errorMessage(error, 'Revisa los datos tributarios y la resolucion.'),
      );
      throw error;
    }
  };

  const handleProfileFormSubmit = (values: FiscalProfileFormValues) =>
    handleProfileSubmit({
      ...values,
      fiscalResponsibilities: commaSeparated(values.fiscalResponsibilities),
    });

  const handleSyncRanges = async () => {
    try {
      const result = await fiscal.rangesQuery.refetch();
      if (result.error) {
        throw result.error;
      }
      toast.success('Rangos actualizados', `${result.data?.items.length ?? 0} rangos disponibles.`);
    } catch (error) {
      toast.error(
        'No se pudieron actualizar los rangos',
        errorMessage(error, 'Intenta nuevamente en unos minutos.'),
      );
    }
  };

  const handleConfigureConnection = async (payload: import('@/types/fiscal').UpsertFactusConnectionPayload) => {
    try {
      await fiscal.configureConnectionMutation.mutateAsync(payload);
      toast.success('Conexion guardada', 'Ahora verifica la conexion antes de emitir documentos.');
    } catch (error) {
      toast.error('No se pudo guardar la conexion', errorMessage(error, 'Revisa las credenciales Factus.'));
      throw error;
    }
  };

  const handleVerifyConnection = async () => {
    try {
      const result = await fiscal.verifyConnectionMutation.mutateAsync();
      if (result.status === 'READY') {
        toast.success('Factus disponible', 'La conexion del tenant quedo lista para sandbox o produccion.');
      } else {
        toast.warning('Conexion requiere revision', result.lastErrorMessage ?? 'Revisa las credenciales o la disponibilidad de Factus.');
      }
    } catch (error) {
      toast.error('No se pudo verificar Factus', errorMessage(error, 'Intenta nuevamente en unos minutos.'));
    }
  };

  const handleSelectRange = async (
    range: FiscalNumberingRangeDto,
    target: 'invoice' | 'credit-note',
  ) => {
    if (!profile) {
      toast.warning(
        'Completa el perfil DIAN',
        'Primero guarda los datos tributarios del restaurante.',
      );
      setIsProfileOpen(true);
      return;
    }
    if (range.isActive === false) {
      toast.warning('Rango no vigente', 'Selecciona un rango activo antes de asignarlo.');
      return;
    }

    const update =
      target === 'invoice'
        ? {
            numberingRangeId: range.id,
            invoiceResolutionNumber:
              range.resolutionNumber ?? profile.invoiceResolutionNumber ?? undefined,
            invoiceResolutionPrefix: range.prefix ?? profile.invoiceResolutionPrefix ?? undefined,
            numberingRangeFrom: range.rangeFrom ?? profile.numberingRangeFrom ?? undefined,
            numberingRangeTo: range.rangeTo ?? profile.numberingRangeTo ?? undefined,
            numberingValidFrom: range.validFrom ?? profile.numberingValidFrom ?? undefined,
            numberingValidUntil: range.validUntil ?? profile.numberingValidUntil ?? undefined,
          }
        : { creditNoteNumberingRangeId: range.id };

    try {
      await fiscal.upsertMutation.mutateAsync(profilePayload(profile, update));
      await fiscal.upsertBranchConfigurationMutation.mutateAsync({
        establishmentName: branchConfiguration?.establishmentName ?? activeBranch?.name,
        establishmentCode: branchConfiguration?.establishmentCode ?? undefined,
        establishmentAddress: branchConfiguration?.establishmentAddress ?? undefined,
        establishmentMunicipality: branchConfiguration?.establishmentMunicipality ?? undefined,
        establishmentPhone: branchConfiguration?.establishmentPhone ?? undefined,
        invoiceNumberingRangeId:
          target === 'invoice' ? range.id : branchConfiguration?.invoiceNumberingRangeId ?? undefined,
        creditNoteNumberingRangeId:
          target === 'credit-note' ? range.id : branchConfiguration?.creditNoteNumberingRangeId ?? undefined,
        supportNumberingRangeId: branchConfiguration?.supportNumberingRangeId ?? undefined,
        adjustmentNumberingRangeId: branchConfiguration?.adjustmentNumberingRangeId ?? undefined,
        isEnabled: target === 'invoice' ? true : branchConfiguration?.isEnabled ?? false,
      });
      toast.success(
        target === 'invoice' ? 'Rango de factura asignado' : 'Rango de nota credito asignado',
        rangeLabel(range),
      );
    } catch (error) {
      toast.error(
        'No se pudo asignar el rango',
        errorMessage(error, 'La configuracion no se pudo actualizar.'),
      );
    }
  };

  const handleRetry = async (document: FiscalDocumentDto) => {
    try {
      const result = await fiscal.retryDocumentMutation.mutateAsync(document.id);
      toast.success('Documento encolado', result.message);
    } catch (error) {
      toast.error(
        'No se pudo reintentar',
        errorMessage(error, 'Revisa el estado y los datos del documento.'),
      );
    }
  };

  const handleDownload = async (document: FiscalDocumentDto) => {
    try {
      const result = await fiscal.downloadArtifactsMutation.mutateAsync(document.id);
      toast.success('Evidencias en cola', result.message);
    } catch (error) {
      toast.error(
        'No se pudieron solicitar las evidencias',
        errorMessage(error, 'El documento debe estar aceptado.'),
      );
    }
  };

  const handleCreateCreditNote = async (
    documentId: string,
    payload: CreateFiscalCreditNotePayload,
  ) => {
    try {
      const result = await fiscal.createCreditNoteMutation.mutateAsync({ id: documentId, payload });
      toast.success('Nota credito en cola', result.message);
    } catch (error) {
      toast.error(
        'No se pudo crear la nota credito',
        errorMessage(error, 'Revisa las cantidades pendientes.'),
      );
      throw error;
    }
  };

  const openDocument = (document: FiscalDocumentDto) => {
    setSelectedDocument(document);
    setIsDetailOpen(true);
  };

  return (
    <>
      <div className="space-y-5" data-cy="fiscal-workspace">
        {!activeBranch ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Selecciona una sede</AlertTitle>
            <AlertDescription>
              El monitor fiscal opera con la sede activa. Cambia de sede desde el selector
              principal.
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-bold">Conexion Factus</h2>
              <StatusPill tone={connection?.status === 'READY' ? 'green' : connection ? 'amber' : 'red'}>
                {connection?.status === 'READY' ? 'Lista' : connection?.status ?? 'Sin configurar'}
              </StatusPill>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {connection
                ? `${connection.environment === 'SANDBOX' ? 'Sandbox' : 'Produccion'} · ${connection.baseUrl}`
                : 'Configura las credenciales del tenant; SuperAdmin no puede operar esta conexion.'}
            </p>
            {connection?.lastErrorMessage ? (
              <p className="mt-1 text-xs text-danger-strong">{connection.lastErrorMessage}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {connection ? (
              <Button type="button" variant="outline" onClick={handleVerifyConnection} disabled={fiscal.verifyConnectionMutation.isPending}>
                {fiscal.verifyConnectionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Verificar
              </Button>
            ) : null}
            <Button type="button" data-cy="factus-connection-configure" onClick={() => setIsConnectionOpen(true)}>
              <PlugZap className="size-4" />
              {connection ? 'Actualizar conexion' : 'Configurar Factus'}
            </Button>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="fiscal-kpi-card gap-4 py-5">
            <CardHeader className="px-5 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>Configuracion DIAN</CardTitle>
                    <StatusPill tone={profile?.isReady ? 'green' : 'amber'}>
                      {profile?.isReady ? 'Lista para operar' : 'Pendiente'}
                    </StatusPill>
                  </div>
                  <CardDescription className="mt-2">
                    Datos tributarios y rangos autorizados del restaurante. La sede activa es{' '}
                    <span className="font-medium text-foreground">
                      {activeBranch?.name ?? 'sin seleccionar'}
                    </span>
                    .
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 bg-background"
                  onClick={() => setIsProfileOpen(true)}
                >
                  <Settings2 className="size-4" />
                  Configurar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 sm:px-6">
              {fiscal.profileQuery.isLoading ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : profile ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Detail label="Razon social" value={profile.legalName} />
                  <Detail label="NIT" value={profile.nit} mono />
                  <Detail
                    label="Resolucion"
                    value={profile.invoiceResolutionNumber ?? 'Pendiente'}
                    detail={
                      profile.invoiceResolutionPrefix
                        ? `Prefijo ${profile.invoiceResolutionPrefix}`
                        : undefined
                    }
                  />
                  <Detail
                    label="Rango de factura"
                    value={
                      profile.numberingRangeId ? `ID ${profile.numberingRangeId}` : 'Sin asignar'
                    }
                    detail={rangeBounds(profile)}
                  />
                  <Detail
                    label="Rango nota credito"
                    value={
                      profile.creditNoteNumberingRangeId
                        ? `ID ${profile.creditNoteNumberingRangeId}`
                        : 'Sin asignar'
                    }
                  />
                  <Detail
                    label="Vigencia"
                    value={
                      profile.numberingValidUntil
                        ? formatDate(profile.numberingValidUntil)
                        : 'Pendiente'
                    }
                    detail={
                      profile.numberingValidFrom
                        ? `Desde ${formatDate(profile.numberingValidFrom)}`
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/25 px-4 py-5 text-sm text-muted-foreground">
                  Aun no hay perfil tributario. Configuralo antes de cerrar ventas que requieran
                  documento fiscal.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <Kpi label="Aceptados" value={acceptedCount} tone="green" />
            <Kpi label="En proceso" value={pendingCount} tone="amber" />
            <Kpi label="Por revisar" value={rejectedCount} tone="red" />
          </div>
        </section>

        <Card className="gap-4 py-5">
          <CardHeader className="px-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Rangos autorizados</CardTitle>
                <CardDescription className="mt-2">
                  Selecciona el rango de factura y el de notas credito asociados al restaurante.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                className="bg-background"
                onClick={handleSyncRanges}
                disabled={fiscal.rangesQuery.isFetching}
              >
                {fiscal.rangesQuery.isFetching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Actualizar rangos
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 px-5 sm:px-6 lg:grid-cols-2">
            <RangePanel
              title="Factura de venta"
              ranges={invoiceRanges}
              selectedId={branchConfiguration?.invoiceNumberingRangeId ?? profile?.numberingRangeId ?? null}
              isSaving={fiscal.upsertMutation.isPending}
              onSelect={(range) => handleSelectRange(range, 'invoice')}
            />
            <RangePanel
              title="Notas credito"
              ranges={creditNoteRanges}
              selectedId={branchConfiguration?.creditNoteNumberingRangeId ?? profile?.creditNoteNumberingRangeId ?? null}
              isSaving={fiscal.upsertMutation.isPending}
              onSelect={(range) => handleSelectRange(range, 'credit-note')}
            />
          </CardContent>
        </Card>

        <Card className="gap-4 py-5">
          <CardHeader className="px-5 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Monitor de documentos</CardTitle>
                <CardDescription className="mt-2">
                  Documentos fiscales de {activeBranch?.name ?? 'la sede activa'} con trazabilidad,
                  evidencias y correcciones.
                </CardDescription>
              </div>
              <span className="nums text-xs font-semibold text-muted-foreground">
                {documents.length} documentos
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-0">
            <DocumentsTable
              documents={documents}
              isLoading={fiscal.documentsQuery.isLoading}
              isDisabled={!activeBranch}
              isRetrying={fiscal.retryDocumentMutation.isPending}
              onOpen={openDocument}
              onRetry={handleRetry}
            />
          </CardContent>
        </Card>
      </div>

      <FiscalProfileFormDialog
        open={isProfileOpen}
        profile={profile}
        isSubmitting={fiscal.upsertMutation.isPending}
        onOpenChange={setIsProfileOpen}
        onSubmit={handleProfileFormSubmit}
      />

      <FactusConnectionDialog
        open={isConnectionOpen}
        connection={connection}
        isSubmitting={fiscal.configureConnectionMutation.isPending}
        onOpenChange={setIsConnectionOpen}
        onSubmit={handleConfigureConnection}
      />

      <FiscalDocumentDetailSheet
        document={selectedDocument}
        open={isDetailOpen}
        isRetrying={fiscal.retryDocumentMutation.isPending}
        isDownloading={fiscal.downloadArtifactsMutation.isPending}
        isCreatingCreditNote={fiscal.createCreditNoteMutation.isPending}
        onOpenChange={setIsDetailOpen}
        onRetry={handleRetry}
        onDownload={handleDownload}
        onCreateCreditNote={(detail, payload) => handleCreateCreditNote(detail.id, payload)}
      />
    </>
  );
}

function DocumentsTable({
  documents,
  isLoading,
  isDisabled,
  isRetrying,
  onOpen,
  onRetry,
}: {
  documents: FiscalDocumentDto[];
  isLoading: boolean;
  isDisabled: boolean;
  isRetrying: boolean;
  onOpen: (document: FiscalDocumentDto) => void;
  onRetry: (document: FiscalDocumentDto) => void;
}) {
  if (isLoading) {
    return (
      <div className="px-5 pb-2 sm:px-6">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isDisabled) {
    return (
      <div className="px-5 pb-2 text-sm text-muted-foreground sm:px-6">
        Selecciona una sede para consultar sus documentos fiscales.
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="px-5 pb-2 text-sm text-muted-foreground sm:px-6">
        Aun no hay documentos fiscales para esta sede.
      </div>
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5 sm:pl-6">Documento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Evidencias</TableHead>
              <TableHead className="pr-5 text-right sm:pr-6">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id} className="fiscal-table-row">
                <TableCell className="max-w-[210px] pl-5 sm:pl-6">
                  <p className="nums truncate font-semibold">{documentReference(document)}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {document.cufe ?? 'Sin CUFE'}
                  </p>
                </TableCell>
                <TableCell className="max-w-[180px]">
                  <p className="truncate">{document.customerName}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {document.customerDocumentNumber ?? 'Consumidor final'}
                  </p>
                </TableCell>
                <TableCell>
                  <StatusPill
                    className="fiscal-status-pop"
                    tone={fiscalDocumentStatusTone(document.status)}
                  >
                    {FISCAL_DOCUMENT_STATUS_LABELS[document.status]}
                  </StatusPill>
                </TableCell>
                <TableCell className="nums font-semibold">
                  {formatMoney(document.totalAmount, document.currency)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {document.hasPdf ? 'PDF' : 'PDF pendiente'} ·{' '}
                  {document.hasXml ? 'XML' : 'XML pendiente'}
                </TableCell>
                <TableCell className="pr-5 text-right sm:pr-6">
                  <div className="flex justify-end gap-1">
                    <IconAction label="Ver detalle" onClick={() => onOpen(document)}>
                      <Eye className="size-4" />
                    </IconAction>
                    {isFiscalDocumentRetriable(document.status) ? (
                      <IconAction
                        label="Reintentar envio"
                        onClick={() => onRetry(document)}
                        disabled={isRetrying}
                      >
                        <RefreshCw className="size-4" />
                      </IconAction>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-2 px-5 pb-2 sm:hidden">
        {documents.map((document) => (
          <article
            key={document.id}
            className="fiscal-mobile-document rounded-lg border border-border bg-background p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="nums truncate text-sm font-semibold">{documentReference(document)}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {document.customerName}
                </p>
              </div>
              <StatusPill tone={fiscalDocumentStatusTone(document.status)}>
                {FISCAL_DOCUMENT_STATUS_LABELS[document.status]}
              </StatusPill>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="nums font-semibold">
                {formatMoney(document.totalAmount, document.currency)}
              </p>
              <div className="flex gap-1">
                <IconAction label="Ver detalle" onClick={() => onOpen(document)}>
                  <Eye className="size-4" />
                </IconAction>
                {isFiscalDocumentRetriable(document.status) ? (
                  <IconAction
                    label="Reintentar envio"
                    onClick={() => onRetry(document)}
                    disabled={isRetrying}
                  >
                    <RefreshCw className="size-4" />
                  </IconAction>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function RangePanel({
  title,
  ranges,
  selectedId,
  isSaving,
  onSelect,
}: {
  title: string;
  ranges: FiscalNumberingRangeDto[];
  selectedId: number | null;
  isSaving: boolean;
  onSelect: (range: FiscalNumberingRangeDto) => void;
}) {
  return (
    <section className="min-w-0" aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{ranges.length} disponibles</span>
      </div>
      <div className="space-y-2">
        {ranges.map((range) => {
          const isSelected = range.id === selectedId;
          return (
            <div
              key={range.id}
              className="fiscal-range-card flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
            >
              <div className="min-w-0">
                <p className="nums truncate text-sm font-semibold">{rangeLabel(range)}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{rangeDates(range)}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={isSelected ? 'secondary' : 'outline'}
                disabled={isSelected || isSaving || range.isActive === false}
                onClick={() => onSelect(range)}
              >
                {isSelected ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <FileCheck2 className="size-4" />
                )}
                {isSelected ? 'Asignado' : 'Usar'}
              </Button>
            </div>
          );
        })}
        {ranges.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/25 px-3 py-4 text-sm text-muted-foreground">
            Actualiza los rangos para ver los autorizados.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Detail({
  label,
  value,
  detail,
  mono = false,
}: {
  label: string;
  value: string;
  detail?: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold ${mono ? 'nums' : ''}`} title={value}>
        {value}
      </p>
      {detail ? (
        <p className="mt-1 truncate text-xs text-muted-foreground" title={detail}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'green' | 'amber' | 'red';
}) {
  const color =
    tone === 'green' ? 'text-success' : tone === 'amber' ? 'text-warning' : 'text-destructive';
  return (
    <Card className="fiscal-kpi-card gap-2 py-4">
      <CardContent className="px-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`nums mt-1 text-2xl font-semibold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function IconAction({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

function profilePayload(
  profile: FiscalProfileDto,
  overrides: Partial<UpsertFiscalProfilePayload>,
): UpsertFiscalProfilePayload {
  return {
    legalName: profile.legalName,
    nit: profile.nit,
    taxRegime: profile.taxRegime ?? undefined,
    fiscalResponsibilities: profile.fiscalResponsibilities,
    municipality: profile.municipality ?? undefined,
    address: profile.address ?? undefined,
    invoiceResolutionNumber: profile.invoiceResolutionNumber ?? undefined,
    invoiceResolutionPrefix: profile.invoiceResolutionPrefix ?? undefined,
    numberingRangeFrom: profile.numberingRangeFrom ?? undefined,
    numberingRangeTo: profile.numberingRangeTo ?? undefined,
    numberingValidFrom: profile.numberingValidFrom ?? undefined,
    numberingValidUntil: profile.numberingValidUntil ?? undefined,
    numberingRangeId: profile.numberingRangeId ?? undefined,
    creditNoteNumberingRangeId: profile.creditNoteNumberingRangeId ?? undefined,
    ...overrides,
  };
}

function rangeLabel(range: FiscalNumberingRangeDto): string {
  const prefix = range.prefix?.trim() || 'Sin prefijo';
  const resolution = range.resolutionNumber ? ` · ${range.resolutionNumber}` : '';
  return `${prefix}${resolution}`;
}

function rangeDates(range: FiscalNumberingRangeDto): string {
  if (range.validFrom && range.validUntil) {
    return `${formatDate(range.validFrom)} - ${formatDate(range.validUntil)}`;
  }
  if (range.rangeFrom !== null && range.rangeTo !== null) {
    return `Consecutivos ${range.rangeFrom} a ${range.rangeTo}`;
  }
  return range.isActive === false ? 'No vigente' : 'Vigencia no informada';
}

function rangeBounds(profile: FiscalProfileDto): string | undefined {
  if (profile.numberingRangeFrom === null || profile.numberingRangeTo === null) {
    return undefined;
  }
  return `${profile.numberingRangeFrom} a ${profile.numberingRangeTo}`;
}

function documentReference(document: FiscalDocumentDto): string {
  return (
    document.factusNumber ??
    document.referenceCode ??
    `${document.prefix ?? 'FE'}-${document.number ?? document.id.slice(-6).toUpperCase()}`
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function commaSeparated(value: string | undefined): string[] | undefined {
  const values = value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return values?.length ? values : undefined;
}
