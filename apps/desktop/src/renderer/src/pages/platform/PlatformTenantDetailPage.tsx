import { useParams } from '@tanstack/react-router';
import { Building2, Loader2, ShieldCheck, Users } from 'lucide-react';
import { PlatformShell, PlatformState, PlatformStatusBadge } from '@/components/platform';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppToast } from '@/hooks/ui';
import {
  usePlatformPlans,
  usePlatformTenant,
  useUpdateTenantPlan,
  useUpdateTenantStatus,
} from '@/hooks/platform';
import { TENANT_STATUSES, type TenantStatus } from '@gastroai/contracts';

export function PlatformTenantDetailPage() {
  const toast = useAppToast();
  const params = useParams({ strict: false }) as { tenantId: string };
  const tenantQuery = usePlatformTenant(params.tenantId);
  const plansQuery = usePlatformPlans();
  const updateStatus = useUpdateTenantStatus(params.tenantId);
  const updatePlan = useUpdateTenantPlan(params.tenantId);
  const tenant = tenantQuery.data;

  const handleStatusChange = async (status: TenantStatus) => {
    try {
      await updateStatus.mutateAsync({ status });
      toast.success('Estado actualizado', `Tenant marcado como ${status}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cambiar el estado.';
      toast.error('Cambio rechazado', message);
    }
  };

  const handlePlanChange = async (planCode: 'BASIC') => {
    try {
      await updatePlan.mutateAsync({ planCode });
      toast.success('Plan actualizado', 'El tenant mantiene BASIC con todos los modulos.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cambiar el plan.';
      toast.error('Cambio rechazado', message);
    }
  };

  return (
    <PlatformShell
      title={tenant?.name ?? 'Detalle tenant'}
      description="Lifecycle, plan, features, sedes y usuarios del restaurante."
    >
      {tenantQuery.isLoading ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="h-80 rounded-xl bg-carbon/5" />
          <div className="h-80 rounded-xl bg-carbon/5" />
        </div>
      ) : tenantQuery.isError || !tenant ? (
        <PlatformState
          title="No se pudo cargar"
          description="El tenant no existe o la sesion platform no tiene acceso."
          tone="danger"
        />
      ) : (
        <div className="platform-stagger grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="platform-card rounded-xl bg-white/88">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Control SaaS</CardTitle>
                  <CardDescription>{tenant.slug}</CardDescription>
                </div>
                <PlatformStatusBadge status={tenant.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Estado
                  </p>
                  <Select value={tenant.status} onValueChange={(value) => handleStatusChange(value as TenantStatus)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TENANT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Plan
                  </p>
                  <Select value={tenant.planCode ?? 'BASIC'} onValueChange={() => handlePlanChange('BASIC')}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(plansQuery.data ?? []).map((plan) => (
                        <SelectItem key={plan.id} value={plan.code}>
                          {plan.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Summary icon={Building2} label="Sedes" value={tenant.branchCount} />
                <Summary icon={Users} label="Usuarios" value={tenant.userCount} />
                <Summary icon={ShieldCheck} label="Activo" value={tenant.isActive ? 'Si' : 'No'} />
              </div>

              <Button disabled={updateStatus.isPending || updatePlan.isPending} variant="outline">
                {updateStatus.isPending || updatePlan.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Guardado automatico
              </Button>
            </CardContent>
          </Card>

          <Card className="platform-card rounded-xl bg-white/88">
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>BASIC incluye todos los modulos. Overrides son de emergencia.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {tenant.features.map((feature) => (
                <Badge
                  key={feature.code}
                  variant={feature.enabled ? 'default' : 'outline'}
                  className={feature.enabled ? 'bg-emerald-700 text-white' : undefined}
                >
                  {feature.code}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card className="platform-card rounded-xl bg-white/88">
            <CardHeader>
              <CardTitle>Sedes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tenant.branches.map((branch) => (
                <div key={branch.id} className="platform-row flex justify-between rounded-lg border p-3 text-sm">
                  <span className="font-semibold">{branch.name}</span>
                  <span className="text-muted-foreground">{branch.code}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="platform-card rounded-xl bg-white/88">
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tenant.users.map((user) => (
                <div key={user.id} className="platform-row flex justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-semibold">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span>{user.role}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </PlatformShell>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border bg-muted/25 p-4">
      <Icon className="mb-3 size-4 text-orange" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="nums mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
