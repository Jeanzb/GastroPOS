import type { PlatformHealthCheckDto, PlatformHealthStatus } from '@gastroai/contracts';
import {
  AlertTriangle,
  Building2,
  DatabaseZap,
  HeartPulse,
  Server,
  ShieldAlert,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';
import {
  PlatformCardSkeleton,
  PlatformMetricCard,
  PlatformShell,
  PlatformState,
  PlatformStatusBadge,
} from '@/components/platform';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformHealth, usePlatformOverview, usePlatformTenants } from '@/hooks/platform';
import { cn } from '@/lib/utils';

const HEALTH_LABELS: Record<PlatformHealthCheckDto['name'], string> = {
  api: 'API',
  postgres: 'PostgreSQL',
  redis: 'Redis',
};

const HEALTH_CLASSES: Record<PlatformHealthStatus, string> = {
  operational: 'border-emerald-700/20 bg-emerald-700/10 text-emerald-800',
  degraded: 'border-warning/30 bg-warning-soft text-warning',
  down: 'border-destructive/25 bg-danger-soft text-destructive',
};

export function PlatformOverviewPage() {
  const overviewQuery = usePlatformOverview();
  const tenantsQuery = usePlatformTenants();
  const healthQuery = usePlatformHealth();
  const overview = overviewQuery.data;
  const tenants = tenantsQuery.data ?? [];
  const alertTenants = tenants.filter((tenant) =>
    ['SUSPENDED', 'PAST_DUE', 'CANCELLED'].includes(tenant.status),
  );
  const operatingBranches = tenants
    .filter((tenant) => !['SUSPENDED', 'CANCELLED', 'ARCHIVED'].includes(tenant.status))
    .reduce((sum, tenant) => sum + tenant.branchCount, 0);

  return (
    <PlatformShell
      title="Panel de control global"
      description="Salud de plataforma, clientes activos y alertas operativas."
    >
      {overviewQuery.isLoading ? (
        <PlatformCardSkeleton />
      ) : overviewQuery.isError ? (
        <PlatformState
          title="No se pudo cargar"
          description="Revisa la sesion platform o el API."
          tone="danger"
        />
      ) : (
        <div className="platform-stagger grid gap-4 md:grid-cols-4">
          <PlatformMetricCard
            icon={Building2}
            label="Restaurantes"
            value={overview?.totalTenants ?? 0}
            hint="Clientes creados"
          />
          <PlatformMetricCard
            icon={ShieldCheck}
            label="Activos"
            value={overview?.activeTenants ?? 0}
            tone="success"
            hint="Acceso normal"
          />
          <PlatformMetricCard
            icon={Warehouse}
            label="Sedes"
            value={operatingBranches}
            hint="Operando en la red"
          />
          <PlatformMetricCard
            icon={ShieldAlert}
            label="Suspendidos"
            value={overview?.suspendedTenants ?? 0}
            tone="danger"
            hint="Operacion bloqueada"
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="platform-card rounded-xl bg-white/88">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-orange/10 text-orange">
                <DatabaseZap className="size-5" />
              </div>
              <div>
                <CardTitle>Actividad reciente</CardTitle>
                <CardDescription>Ultimos restaurantes creados o modificados.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tenantsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 rounded-lg" />
              </div>
            ) : tenants.length ? (
              <div className="divide-y divide-border">
                {tenants.slice(0, 6).map((tenant) => (
                  <div
                    key={tenant.id}
                    className="platform-row flex items-center justify-between rounded-lg px-2 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{tenant.name}</p>
                      <p className="text-muted-foreground">
                        {tenant.municipality ?? 'Ciudad sin registrar'} - {tenant.branchCount} sedes -{' '}
                        {tenant.userCount} usuarios
                      </p>
                    </div>
                    <PlatformStatusBadge status={tenant.status} />
                  </div>
                ))}
              </div>
            ) : (
              <PlatformState title="Sin restaurantes" description="Crea el primer restaurante desde Restaurantes." />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="platform-card rounded-xl bg-white/88">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-emerald-700/10 text-emerald-800">
                  <HeartPulse className="size-5" />
                </div>
                <div>
                  <CardTitle>Salud plataforma</CardTitle>
                  <CardDescription>API, base de datos y cache en tiempo real.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {healthQuery.isLoading ? (
                <Skeleton className="h-28 rounded-xl" />
              ) : healthQuery.isError || !healthQuery.data ? (
                <PlatformState
                  title="Health no disponible"
                  description="El endpoint platform no respondio correctamente."
                  tone="danger"
                />
              ) : (
                <div className="space-y-3">
                  <Badge
                    variant="outline"
                    className={cn('rounded-full px-3 py-1 font-semibold', HEALTH_CLASSES[healthQuery.data.status])}
                  >
                    {healthQuery.data.status === 'operational'
                      ? 'Operativa'
                      : healthQuery.data.status === 'degraded'
                        ? 'Degradada'
                        : 'Caida'}
                  </Badge>
                  {healthQuery.data.checks.map((check) => (
                    <HealthCheckRow key={check.name} check={check} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="platform-card rounded-xl border-orange/25 bg-white/88">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-warning-soft text-warning">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <CardTitle>Alertas de acceso</CardTitle>
                  <CardDescription>Clientes que requieren accion de soporte.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tenantsQuery.isLoading ? (
                <Skeleton className="h-16 rounded-lg" />
              ) : alertTenants.length ? (
                <div className="grid gap-3">
                  {alertTenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className="platform-row rounded-lg border border-orange/25 bg-orange/8 p-4"
                    >
                      <p className="font-semibold">{tenant.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        NIT {tenant.nit ?? 'sin registrar'} - {tenant.municipality ?? 'sin ciudad'}
                      </p>
                      <PlatformStatusBadge status={tenant.status} className="mt-3" />
                    </div>
                  ))}
                </div>
              ) : (
                <PlatformState title="Sin alertas" description="No hay restaurantes suspendidos, cancelados o en mora." />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PlatformShell>
  );
}

function HealthCheckRow({ check }: { check: PlatformHealthCheckDto }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-muted/25 px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <Server className="size-4 text-muted-foreground" />
        <span className="font-semibold">{HEALTH_LABELS[check.name]}</span>
      </div>
      <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', HEALTH_CLASSES[check.status])}>
        {check.status === 'operational' ? 'OK' : check.status === 'degraded' ? 'Degradado' : 'Caido'}
        {typeof check.latencyMs === 'number' ? ` - ${check.latencyMs}ms` : ''}
      </span>
    </div>
  );
}
