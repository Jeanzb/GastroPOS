import { useParams } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { PlatformShell } from '@/components/platform';
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
        <p className="text-sm text-muted-foreground">Cargando tenant...</p>
      ) : tenantQuery.isError || !tenant ? (
        <p className="text-sm text-destructive">No se pudo cargar el tenant.</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Control SaaS</CardTitle>
              <CardDescription>{tenant.slug}</CardDescription>
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
                <Summary label="Sedes" value={tenant.branchCount} />
                <Summary label="Usuarios" value={tenant.userCount} />
                <Summary label="Activo" value={tenant.isActive ? 'Si' : 'No'} />
              </div>

              <Button disabled={updateStatus.isPending || updatePlan.isPending} variant="outline">
                {updateStatus.isPending || updatePlan.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Guardado automatico
              </Button>
            </CardContent>
          </Card>

          <Card>
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

          <Card>
            <CardHeader>
              <CardTitle>Sedes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tenant.branches.map((branch) => (
                <div key={branch.id} className="flex justify-between rounded-lg border p-3 text-sm">
                  <span className="font-semibold">{branch.name}</span>
                  <span className="text-muted-foreground">{branch.code}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tenant.users.map((user) => (
                <div key={user.id} className="flex justify-between rounded-lg border p-3 text-sm">
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

function Summary({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-muted/25 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
