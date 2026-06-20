import { useEffect, useMemo, useState } from 'react';
import { Loader2, RotateCcw, ShieldAlert } from 'lucide-react';
import { PlatformShell } from '@/components/platform';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAppToast } from '@/hooks/ui';
import {
  useDeleteTenantFeatureOverride,
  usePlatformFeatures,
  usePlatformTenantFeatures,
  usePlatformTenants,
  useUpdateTenantFeatureOverride,
} from '@/hooks/platform';
import type { TenantFeatureOverrideDto } from '@gastroai/contracts';

export function PlatformFeaturesPage() {
  const toast = useAppToast();
  const tenantsQuery = usePlatformTenants();
  const featuresQuery = usePlatformFeatures();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const tenantFeaturesQuery = usePlatformTenantFeatures(selectedTenantId);
  const updateOverride = useUpdateTenantFeatureOverride(selectedTenantId ?? '');
  const deleteOverride = useDeleteTenantFeatureOverride(selectedTenantId ?? '');
  const [pendingFeature, setPendingFeature] = useState<TenantFeatureOverrideDto | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!selectedTenantId && tenantsQuery.data?.[0]) {
      setSelectedTenantId(tenantsQuery.data[0].id);
    }
  }, [selectedTenantId, tenantsQuery.data]);

  const selectedTenant = useMemo(
    () => tenantsQuery.data?.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [selectedTenantId, tenantsQuery.data],
  );

  const handleEnable = async (feature: TenantFeatureOverrideDto) => {
    if (!selectedTenantId) {
      return;
    }
    try {
      await updateOverride.mutateAsync({
        featureCode: feature.code,
        payload: { enabled: true, reason: 'Activacion manual desde platform' },
      });
      toast.success('Modulo activado', `${feature.code} quedo disponible para el tenant.`);
    } catch (error) {
      toast.error('No se pudo activar', errorMessage(error));
    }
  };

  const handleDisable = async () => {
    if (!pendingFeature || !selectedTenantId || !reason.trim()) {
      return;
    }
    try {
      await updateOverride.mutateAsync({
        featureCode: pendingFeature.code,
        payload: { enabled: false, reason: reason.trim() },
      });
      toast.warning('Modulo desactivado', `${pendingFeature.code} quedo bloqueado para este tenant.`);
      setPendingFeature(null);
      setReason('');
    } catch (error) {
      toast.error('No se pudo desactivar', errorMessage(error));
    }
  };

  const handleReset = async (feature: TenantFeatureOverrideDto) => {
    if (!selectedTenantId) {
      return;
    }
    try {
      await deleteOverride.mutateAsync(feature.code);
      toast.info('Override removido', `${feature.code} vuelve a heredar BASIC.`);
    } catch (error) {
      toast.error('No se pudo remover', errorMessage(error));
    }
  };

  return (
    <PlatformShell
      title="Licencias y modulos"
      description="Controla emergencias por tenant sin cambiar el plan BASIC."
    >
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
            <CardDescription>Selecciona el tenant que vas a administrar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedTenantId ?? undefined} onValueChange={setSelectedTenantId}>
              <SelectTrigger className="w-full" data-cy="platform-feature-tenant-select">
                <SelectValue placeholder="Selecciona tenant" />
              </SelectTrigger>
              <SelectContent>
                {(tenantsQuery.data ?? []).map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTenant ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-semibold">{selectedTenant.name}</p>
                <p className="text-muted-foreground">{selectedTenant.slug}</p>
                <Badge className="mt-3 bg-carbon text-white">{selectedTenant.status}</Badge>
              </div>
            ) : null}
            <div className="rounded-lg border border-orange/20 bg-orange/8 p-4 text-sm text-carbon">
              <ShieldAlert className="mb-2 size-4 text-orange" />
              Los overrides son para incidentes o soporte. El plan comercial sigue siendo BASIC.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature flags</CardTitle>
            <CardDescription>
              {featuresQuery.data?.length ?? 0} modulos registrados en la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tenantFeaturesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando modulos...</p>
            ) : tenantFeaturesQuery.isError ? (
              <p className="text-sm text-destructive">No se pudieron cargar los modulos.</p>
            ) : tenantFeaturesQuery.data?.length ? (
              <div className="space-y-3" data-cy="platform-feature-list">
                {tenantFeaturesQuery.data.map((feature) => (
                  <div
                    key={feature.code}
                    className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_auto]"
                    data-cy="platform-feature-row"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{feature.name}</p>
                        <Badge variant={feature.source === 'OVERRIDE' ? 'destructive' : 'secondary'}>
                          {feature.source}
                        </Badge>
                        <Badge variant={feature.enabled ? 'default' : 'outline'}>
                          {feature.enabled ? 'Activo' : 'Bloqueado'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{feature.code}</p>
                      {feature.overrideReason ? (
                        <p className="mt-2 text-sm text-orange">{feature.overrideReason}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={feature.enabled}
                        onCheckedChange={(checked) =>
                          checked ? handleEnable(feature) : setPendingFeature(feature)
                        }
                        disabled={updateOverride.isPending}
                        data-cy={`platform-feature-toggle-${feature.code}`}
                      />
                      {feature.source === 'OVERRIDE' ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => handleReset(feature)}
                          disabled={deleteOverride.isPending}
                          title="Heredar BASIC"
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Selecciona un tenant para ver sus modulos.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(pendingFeature)} onOpenChange={(open) => !open && setPendingFeature(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar modulo</DialogTitle>
            <DialogDescription>
              Indica el motivo operativo. Esta accion bloquea el modulo para el tenant seleccionado.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ej. Incidente de soporte, deuda operacional o bloqueo temporal"
            data-cy="platform-feature-disable-reason"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDisable}
              disabled={!reason.trim() || updateOverride.isPending}
              data-cy="platform-feature-disable-confirm"
            >
              {updateOverride.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Desactivar modulo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformShell>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Operacion rechazada por el API.';
}
