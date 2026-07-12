import type { PlatformIntegrationLogDto, PlatformIntegrationLogStatus } from '@gastroai/contracts';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Gauge } from 'lucide-react';
import { PlatformMetricCard, PlatformShell, PlatformState } from '@/components/platform';
import { Badge } from '@/components/ui/badge';
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
import { usePlatformIntegrationLogs, usePlatformIntegrationSummary } from '@/hooks/platform';
import { formatDateTime } from '@/lib';
import { cn } from '@/lib/utils';

const STATUS_CLASS: Record<PlatformIntegrationLogStatus, string> = {
  SUCCESS: 'border-emerald-700/20 bg-emerald-700/10 text-emerald-800',
  WARNING: 'border-warning/30 bg-warning-soft text-warning',
  ERROR: 'border-destructive/25 bg-danger-soft text-destructive',
};

const OPERATION_LABEL: Record<PlatformIntegrationLogDto['operation'], string> = {
  HEALTH_CHECK: 'Health check',
  AUTHENTICATION: 'Autenticacion',
  API_REQUEST: 'Solicitud API',
};

export function PlatformIntegrationsPage() {
  const summaryQuery = usePlatformIntegrationSummary();
  const logsQuery = usePlatformIntegrationLogs();
  const summary = summaryQuery.data;
  const logs = logsQuery.data ?? [];

  return (
    <PlatformShell
      title="Integraciones"
      description="Disponibilidad y telemetria tecnica global de servicios externos."
    >
      {summaryQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28" />
        </div>
      ) : summaryQuery.isError || !summary ? (
        <PlatformState
          title="Telemetria no disponible"
          description="No se pudo consultar el estado global del servicio de facturacion electronica."
          tone="danger"
        />
      ) : (
        <div className="platform-stagger grid gap-4 md:grid-cols-4">
          <PlatformMetricCard
            icon={Activity}
            label="Eventos"
            value={summary.totalEvents}
            hint="Registro tecnico global"
          />
          <PlatformMetricCard
            icon={CheckCircle2}
            label="Correctos"
            value={summary.successfulEvents}
            tone="success"
            hint="Solicitudes completadas"
          />
          <PlatformMetricCard
            icon={Gauge}
            label="Advertencias"
            value={summary.warningEvents}
            tone="warning"
            hint="Reintentos o limites"
          />
          <PlatformMetricCard
            icon={AlertTriangle}
            label="Errores"
            value={summary.failedEvents}
            tone="danger"
            hint="Sin datos de restaurantes"
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="platform-card rounded-xl bg-white/88">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-orange/10 text-orange">
                <Activity className="size-5" />
              </div>
              <div>
                <CardTitle>Facturacion electronica</CardTitle>
                <CardDescription>
                  Estado tecnico del proveedor administrado por la plataforma.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-carbon/10 bg-muted/25 p-4">
              <p className="text-sm text-muted-foreground">Ultimo evento</p>
              <p className="mt-1 font-semibold">
                {summary?.lastEventAt ? formatDateTime(summary.lastEventAt) : 'Sin eventos'}
              </p>
            </div>
            <div className="rounded-lg border border-carbon/10 bg-muted/25 p-4">
              <p className="text-sm text-muted-foreground">Ultimo error</p>
              <p className="mt-1 font-semibold">
                {summary?.lastErrorAt
                  ? formatDateTime(summary.lastErrorAt)
                  : 'Sin errores registrados'}
              </p>
            </div>
            <div className="rounded-lg border border-orange/20 bg-orange/8 p-4 text-sm text-carbon">
              <Clock3 className="mb-2 size-4 text-orange" />
              Este panel no muestra ventas, clientes, documentos, payloads ni credenciales de
              restaurantes.
            </div>
          </CardContent>
        </Card>

        <Card className="platform-card rounded-xl bg-white/88">
          <CardHeader>
            <CardTitle>Logs tecnicos recientes</CardTitle>
            <CardDescription>
              Respuestas sanitizadas para diagnostico de disponibilidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {logsQuery.isLoading ? (
              <div className="p-5">
                <Skeleton className="h-28" />
              </div>
            ) : logsQuery.isError ? (
              <div className="p-5">
                <PlatformState
                  title="Logs no disponibles"
                  description="No se pudo consultar la telemetria tecnica."
                  tone="danger"
                />
              </div>
            ) : logs.length === 0 ? (
              <div className="p-5">
                <PlatformState
                  title="Sin logs aun"
                  description="Los eventos apareceran cuando la integracion realice una comprobacion o solicitud."
                />
              </div>
            ) : (
              <Table className="min-w-[660px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Fecha</TableHead>
                    <TableHead>Operacion</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>HTTP</TableHead>
                    <TableHead className="pr-5">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformShell>
  );
}

function LogRow({ log }: { log: PlatformIntegrationLogDto }) {
  return (
    <TableRow className="platform-row">
      <TableCell className="pl-5 text-xs text-muted-foreground">
        {formatDateTime(log.createdAt)}
      </TableCell>
      <TableCell>{OPERATION_LABEL[log.operation]}</TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('rounded-full', STATUS_CLASS[log.status])}>
          {log.status}
        </Badge>
      </TableCell>
      <TableCell className="nums">{log.httpStatus ?? '—'}</TableCell>
      <TableCell
        className="max-w-[260px] truncate pr-5 text-xs text-muted-foreground"
        title={log.message ?? undefined}
      >
        {log.message ?? log.errorCode ?? 'Sin detalle'}
      </TableCell>
    </TableRow>
  );
}
