import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Loader2,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { StatusPill } from '@/components/operations';
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
import { formatDate } from '@/lib';
import type { FiscalProfileFormValues } from '@/schemas/fiscal';
import type {
  FiscalEnvironment,
  FiscalProfileDto,
  FiscalProviderStatus,
  FiscalProviderType,
  UpsertFiscalProfilePayload,
} from '@/types/fiscal';
import { FiscalProfileFormDialog } from './FiscalProfileFormDialog';

const STATUS_LABELS: Record<FiscalProviderStatus, string> = {
  NOT_CONFIGURED: 'Sin configurar',
  CONFIGURED: 'Configurado',
  CONNECTION_TESTED: 'Conexion validada',
  ERROR: 'Revisar',
};

const ENVIRONMENT_LABELS: Record<FiscalEnvironment, string> = {
  TEST: 'Pruebas',
  PRODUCTION: 'Produccion',
};

const PROVIDER_TYPE_LABELS: Record<FiscalProviderType, string> = {
  DIAN_DIRECT: 'DIAN directo',
  TECHNOLOGY_PROVIDER: 'Proveedor tecnologico',
  API_PROVIDER: 'API fiscal',
};

function statusTone(status: FiscalProviderStatus | undefined) {
  if (status === 'CONNECTION_TESTED') {
    return 'green';
  }
  if (status === 'ERROR') {
    return 'red';
  }
  if (status === 'CONFIGURED') {
    return 'amber';
  }
  return 'neutral';
}

function profileStatus(profile: FiscalProfileDto | null): string {
  if (!profile?.providerConfig) {
    return STATUS_LABELS.NOT_CONFIGURED;
  }
  return STATUS_LABELS[profile.providerConfig.status];
}

function optionalString(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function commaList(value?: string): string[] | undefined {
  const values = value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return values?.length ? values : undefined;
}

function toFiscalPayload(values: FiscalProfileFormValues): UpsertFiscalProfilePayload {
  return {
    legalName: values.legalName,
    nit: values.nit,
    taxRegime: optionalString(values.taxRegime),
    fiscalResponsibilities: commaList(values.fiscalResponsibilities),
    municipality: optionalString(values.municipality),
    address: optionalString(values.address),
    invoiceResolutionNumber: optionalString(values.invoiceResolutionNumber),
    invoiceResolutionPrefix: optionalString(values.invoiceResolutionPrefix?.toUpperCase()),
    numberingRangeFrom: values.numberingRangeFrom,
    numberingRangeTo: values.numberingRangeTo,
    numberingValidFrom: optionalString(values.numberingValidFrom),
    numberingValidUntil: optionalString(values.numberingValidUntil),
    providerConfig: {
      providerType: values.providerType,
      providerName: optionalString(values.providerName),
      environment: values.environment,
      endpointUrl: optionalString(values.endpointUrl),
      softwareId: optionalString(values.softwareId),
      certificateAlias: optionalString(values.certificateAlias),
      accountId: optionalString(values.accountId),
      apiKeyRef: optionalString(values.apiKeyRef),
    },
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function ReadinessSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function FiscalWorkspace() {
  const fiscal = useFiscalProfile();
  const profile = fiscal.profileQuery.data ?? null;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const isSaving = fiscal.upsertMutation.isPending;
  const isTesting = fiscal.testConnectionMutation.isPending;
  const provider = profile?.providerConfig;
  const currentStatus = provider?.status;

  const onSubmitProfile = async (values: FiscalProfileFormValues) => {
    try {
      await fiscal.upsertMutation.mutateAsync(toFiscalPayload(values));
      toast.success('Perfil fiscal guardado', {
        description: `${values.legalName} quedo en modo ${ENVIRONMENT_LABELS[values.environment].toLowerCase()}.`,
      });
    } catch (error) {
      toast.error('No se pudo guardar el perfil fiscal', {
        description: getErrorMessage(error, 'Valida NIT, resolucion y proveedor.'),
      });
      throw error;
    }
  };

  const onTestConnection = async () => {
    try {
      const result = await fiscal.testConnectionMutation.mutateAsync();
      if (result.status === 'CONNECTION_TESTED') {
        toast.success('Conexion fiscal validada', {
          description: result.message,
        });
        return;
      }
      toast.error('Proveedor fiscal requiere revision', {
        description: result.message,
      });
    } catch (error) {
      toast.error('No se pudo probar la conexion fiscal', {
        description: getErrorMessage(error, 'Revisa endpoint, credenciales y entorno.'),
      });
    }
  };

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <Card className="gap-5 border-border/80 bg-surface-raised py-5 shadow-sm">
            <CardHeader className="px-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Perfil fiscal</CardTitle>
                  <CardDescription>
                    Configuracion para proveedor tecnologico o integracion DIAN
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="bg-background"
                    onClick={() => setIsFormOpen(true)}
                  >
                    <Settings className="h-4 w-4" />
                    Configurar
                  </Button>
                  <Button
                    type="button"
                    disabled={!provider || isTesting}
                    onClick={onTestConnection}
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Probar conexion
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5">
              {fiscal.profileQuery.isLoading ? <ReadinessSkeleton /> : null}
              {!fiscal.profileQuery.isLoading ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Ambiente</p>
                    <p className="mt-2 font-semibold">
                      {provider ? ENVIRONMENT_LABELS[provider.environment] : 'Sin configurar'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Resolucion</p>
                    <p className="mt-2 font-semibold">
                      {profile?.invoiceResolutionNumber ?? 'Pendiente'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {profile?.invoiceResolutionPrefix
                        ? `Prefijo ${profile.invoiceResolutionPrefix}`
                        : 'Sin prefijo'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Proveedor</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {provider?.providerName ??
                          (provider ? PROVIDER_TYPE_LABELS[provider.providerType] : 'No conectado')}
                      </p>
                      <StatusPill tone={statusTone(currentStatus)}>
                        {profileStatus(profile)}
                      </StatusPill>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="gap-4 border-border/80 bg-surface-raised py-5 shadow-sm">
            <CardHeader className="px-5">
              <CardTitle>Monitor de documentos</CardTitle>
              <CardDescription>Estados, reintentos y referencias externas</CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Aun no hay documentos emitidos. Los comprobantes apareceran aqui cuando
                        empieces a facturar.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="gap-4 border-border/80 bg-carbon py-5 text-white shadow-lg shadow-carbon/10">
            <CardHeader className="px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Readiness</CardTitle>
                  <CardDescription className="text-white/55">
                    Sin promesa legal hasta validar
                  </CardDescription>
                </div>
                {profile?.isReady ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <FileCheck2 className="h-5 w-5 text-orange" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-5">
              <div className="rounded-lg border border-warning/25 bg-warning-soft p-4 text-amber-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <p className="text-sm">
                    Preparado para integracion fiscal; no certifica cumplimiento DIAN sin
                    habilitacion, certificado y proveedor validado.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-white/55">Razon social</p>
                <p className="mt-1 font-semibold">{profile?.legalName ?? 'Pendiente'}</p>
                <p className="mt-1 text-sm text-white/50">
                  NIT {profile?.nit ?? 'sin configurar'}
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-white/55">Ultima prueba</p>
                <p className="mt-1 font-semibold">
                  {provider?.lastConnectionTestAt
                    ? formatDate(provider.lastConnectionTestAt)
                    : 'Sin pruebas'}
                </p>
                {provider?.lastConnectionError ? (
                  <p className="mt-2 text-sm text-red-600">{provider.lastConnectionError}</p>
                ) : null}
              </div>

              <Button className="w-full" disabled>
                <RefreshCw className="h-4 w-4" />
                Reintentar rechazados
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <FiscalProfileFormDialog
        open={isFormOpen}
        profile={profile}
        isSubmitting={isSaving}
        onOpenChange={setIsFormOpen}
        onSubmit={onSubmitProfile}
      />
    </>
  );
}
