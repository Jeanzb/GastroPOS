import { AlertTriangle, Building2, Clock3, DatabaseZap, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  PlatformCardSkeleton,
  PlatformMetricCard,
  PlatformShell,
  PlatformState,
  PlatformStatusBadge,
} from '@/components/platform';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformOverview, usePlatformTenants } from '@/hooks/platform';

export function PlatformOverviewPage() {
  const overviewQuery = usePlatformOverview();
  const tenantsQuery = usePlatformTenants();
  const overview = overviewQuery.data;
  const alertTenants = (tenantsQuery.data ?? []).filter((tenant) =>
    ['SUSPENDED', 'PAST_DUE', 'CANCELLED'].includes(tenant.status),
  );

  return (
    <PlatformShell
      title="Overview global"
      description="Estado comercial y operativo de restaurantes conectados."
    >
      {overviewQuery.isLoading ? (
        <PlatformCardSkeleton count={4} />
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
            label="Tenants"
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
            icon={Clock3}
            label="Trial"
            value={overview?.trialTenants ?? 0}
            hint="En evaluacion"
          />
          <PlatformMetricCard
            icon={ShieldAlert}
            label="Suspendidos"
            value={overview?.suspendedTenants ?? 0}
            tone="danger"
            hint="Operaciones bloqueadas"
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
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-12 rounded-lg" />
              </div>
            ) : tenantsQuery.data?.length ? (
              <div className="divide-y divide-border">
                {tenantsQuery.data.slice(0, 6).map((tenant) => (
                  <div
                    key={tenant.id}
                    className="platform-row flex items-center justify-between rounded-lg px-2 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{tenant.name}</p>
                      <p className="text-muted-foreground">
                        {tenant.slug} - {tenant.branchCount} sedes - {tenant.userCount} usuarios
                      </p>
                    </div>
                    <PlatformStatusBadge status={tenant.status} />
                  </div>
                ))}
              </div>
            ) : (
              <PlatformState title="Sin tenants" description="Crea el primer restaurante desde Restaurantes." />
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
                <CardDescription>Clientes que requieren accion de soporte o cobranza.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tenantsQuery.isLoading ? (
              <Skeleton className="h-16 rounded-lg" />
            ) : alertTenants.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {alertTenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="platform-row rounded-lg border border-orange/25 bg-orange/8 p-4"
                  >
                    <p className="font-semibold">{tenant.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{tenant.slug}</p>
                    <PlatformStatusBadge status={tenant.status} className="mt-3" />
                  </div>
                ))}
              </div>
            ) : (
              <PlatformState title="Sin alertas" description="No hay tenants suspendidos, cancelados o en mora." />
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformShell>
  );
}
