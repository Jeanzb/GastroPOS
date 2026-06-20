import type { ElementType } from 'react';
import { AlertCircle, Building2, Clock3, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PlatformShell } from '@/components/platform';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformOverview, usePlatformTenants } from '@/hooks/platform';

export function PlatformOverviewPage() {
  const overviewQuery = usePlatformOverview();
  const tenantsQuery = usePlatformTenants();
  const overview = overviewQuery.data;

  return (
    <PlatformShell
      title="Overview global"
      description="Estado comercial y operativo de restaurantes conectados."
    >
      {overviewQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : overviewQuery.isError ? (
        <StatusCard title="No se pudo cargar" description="Revisa la sesion platform o el API." />
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard icon={Building2} label="Tenants" value={overview?.totalTenants ?? 0} />
          <MetricCard icon={ShieldCheck} label="Activos" value={overview?.activeTenants ?? 0} />
          <MetricCard icon={Clock3} label="Trial" value={overview?.trialTenants ?? 0} />
          <MetricCard icon={ShieldAlert} label="Suspendidos" value={overview?.suspendedTenants ?? 0} />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
          <CardDescription>Ultimos restaurantes creados o modificados.</CardDescription>
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
                <div key={tenant.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-semibold">{tenant.name}</p>
                    <p className="text-muted-foreground">{tenant.slug}</p>
                  </div>
                  <span className="rounded-full bg-carbon px-2.5 py-1 text-xs font-semibold text-white">
                    {tenant.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <StatusCard title="Sin tenants" description="Crea el primer restaurante desde Restaurantes." />
          )}
        </CardContent>
      </Card>
    </PlatformShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: number;
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="pt-6">
        <Icon className="mb-4 size-5 text-orange" />
        <p className="font-display text-3xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatusCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm">
      <AlertCircle className="mt-0.5 size-4 text-orange" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
