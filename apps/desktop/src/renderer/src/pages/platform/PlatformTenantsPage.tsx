import type { ChangeEventHandler, ElementType, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Loader2, Plus, Search, ShieldAlert, Store, Warehouse } from 'lucide-react';
import { PlatformShell, PlatformState, PlatformStatusBadge } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCreatePlatformTenant, usePlatformTenants, useUpdateTenantStatus } from '@/hooks/platform';
import { useAppToast } from '@/hooks/ui';
import { BASIC_PLAN_CURRENCY, BASIC_PLAN_PRICE_AMOUNT } from '@/lib/platform-labels';
import { formatMoney } from '@/lib/format';
import type { PlatformTenantDto, TenantStatus } from '@gastroai/contracts';

const EMPTY_TENANT_FORM = {
  name: '',
  nit: '',
  municipality: '',
  taxRegime: 'Responsable de IVA',
  fiscalResponsibility: 'Responsable de IVA',
  ownerEmail: '',
  ownerFullName: '',
  ownerTemporaryPassword: '',
  branchName: 'Sede Principal',
  branchCode: 'MAIN',
  branchAddress: '',
  branchPhone: '',
};

export function PlatformTenantsPage() {
  const toast = useAppToast();
  const tenantsQuery = usePlatformTenants();
  const createTenant = useCreatePlatformTenant();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_TENANT_FORM);
  const [search, setSearch] = useState('');
  const [selectedTenantAction, setSelectedTenantAction] = useState<{
    tenant: PlatformTenantDto;
    status: TenantStatus;
  } | null>(null);
  const updateStatus = useUpdateTenantStatus(selectedTenantAction?.tenant.id ?? '');

  const tenants = tenantsQuery.data ?? [];
  const filteredTenants = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return tenants;
    }
    return tenants.filter((tenant) =>
      [tenant.name, tenant.nit, tenant.municipality]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(needle)),
    );
  }, [search, tenants]);

  const stats = useMemo(() => {
    const activeTenants = tenants.filter((tenant) => tenant.status === 'ACTIVE').length;
    const operatingBranches = tenants
      .filter((tenant) => !['SUSPENDED', 'CANCELLED', 'ARCHIVED'].includes(tenant.status))
      .reduce((sum, tenant) => sum + tenant.branchCount, 0);
    const blockedTenants = tenants.filter((tenant) =>
      ['SUSPENDED', 'PAST_DUE', 'CANCELLED'].includes(tenant.status),
    ).length;
    return { activeTenants, operatingBranches, blockedTenants };
  }, [tenants]);

  const handleChange =
    (key: keyof typeof form): ChangeEventHandler<HTMLInputElement> =>
    (event) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createTenant.mutateAsync(form);
      toast.success('Restaurante creado', 'El cliente quedo activo con plan BASIC.');
      setForm(EMPTY_TENANT_FORM);
      setIsDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el restaurante.';
      toast.error('No se pudo crear', message);
    }
  };

  const handleStatusAction = async () => {
    if (!selectedTenantAction) {
      return;
    }
    try {
      await updateStatus.mutateAsync({
        status: selectedTenantAction.status,
        suspensionReason:
          selectedTenantAction.status === 'SUSPENDED'
            ? 'Suspension manual desde platform'
            : null,
      });
      toast.success('Estado actualizado', `${selectedTenantAction.tenant.name} quedo actualizado.`);
      setSelectedTenantAction(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cambiar el estado.';
      toast.error('Cambio rechazado', message);
    }
  };

  return (
    <PlatformShell
      title="Restaurantes"
      description="Gestion de restaurantes, sedes y suscripciones BASIC."
    >
      <div className="mb-6 flex flex-col gap-4 border-b border-carbon/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div />
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <div className="flex h-11 min-w-[300px] items-center gap-2 rounded-xl border border-carbon/10 bg-white px-3 shadow-sm focus-within:border-orange/45">
            <Search className="size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar restaurante, NIT..."
              className="h-9 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              data-cy="platform-tenant-search"
            />
          </div>
          <CreateTenantDialog
            open={isDialogOpen}
            form={form}
            isSubmitting={createTenant.isPending}
            onOpenChange={setIsDialogOpen}
            onChange={handleChange}
            onSubmit={handleCreate}
          />
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Restaurantes activos" value={stats.activeTenants} hint={`${tenants.length} en total`} icon={Store} />
        <MetricCard label="Sedes operando" value={stats.operatingBranches} hint="Activas en la red" icon={Warehouse} />
        <MetricCard label="Seguimiento" value={stats.blockedTenants} hint="En mora, suspendidos o cancelados" icon={ShieldAlert} />
      </div>

      <Card className="platform-card rounded-xl bg-white/92">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-bold">Directorio de restaurantes</h2>
              <p className="mt-1 text-sm text-muted-foreground">Clientes operativos de GastroAI.</p>
            </div>
            <p className="nums text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {filteredTenants.length} restaurantes
            </p>
          </div>

          {tenantsQuery.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
          ) : tenantsQuery.isError ? (
            <div className="p-5">
              <PlatformState
                title="No se pudieron cargar"
                description="La sesion platform no pudo consultar los restaurantes."
                tone="danger"
              />
            </div>
          ) : filteredTenants.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurante</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Sedes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Mensualidad</TableHead>
                  <TableHead className="text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id} className="platform-row" data-cy="platform-tenant-row">
                    <TableCell>
                      <Link
                        to="/platform/tenants/$tenantId"
                        params={{ tenantId: tenant.id }}
                        className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
                      >
                        <TenantAvatar name={tenant.name} />
                        <div>
                          <p className="font-semibold">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tenant.municipality ?? 'Ciudad sin registrar'}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="nums text-muted-foreground">{tenant.nit ?? 'Sin NIT'}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-emerald-700/10 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        BASIC
                      </span>
                    </TableCell>
                    <TableCell className="nums font-semibold">{tenant.branchCount}</TableCell>
                    <TableCell>
                      <PlatformStatusBadge status={tenant.status} />
                    </TableCell>
                    <TableCell className="nums text-right font-bold">
                      {formatMoney(tenant.planPriceAmount ?? BASIC_PLAN_PRICE_AMOUNT, tenant.planPriceCurrency ?? BASIC_PLAN_CURRENCY)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedTenantAction({
                            tenant,
                            status: tenant.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
                          })
                        }
                      >
                        {tenant.status === 'SUSPENDED' ? 'Reactivar' : 'Suspender'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-5">
              <PlatformState
                title={search.trim() ? 'Sin resultados' : 'Aun no hay restaurantes'}
                description={
                  search.trim()
                    ? 'Ajusta la busqueda por nombre o NIT.'
                    : 'Crea el primer restaurante para activar el panel SaaS.'
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedTenantAction)} onOpenChange={(open) => !open && setSelectedTenantAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar estado del restaurante</DialogTitle>
            <DialogDescription>
              Esta accion actualiza el cache de acceso y afecta operaciones del restaurante.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-xl border bg-muted/35 p-4 text-sm">
            {selectedTenantAction?.tenant.name} pasara a estado{' '}
            <strong>{selectedTenantAction?.status}</strong>.
          </p>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleStatusAction}
              disabled={updateStatus.isPending}
              data-cy="platform-tenant-status-confirm"
            >
              {updateStatus.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformShell>
  );
}

function CreateTenantDialog({
  open,
  form,
  isSubmitting,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean;
  form: typeof EMPTY_TENANT_FORM;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (key: keyof typeof EMPTY_TENANT_FORM) => ChangeEventHandler<HTMLInputElement>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-11 bg-orange text-white hover:bg-orange/90" data-cy="platform-new-tenant">
          <Plus className="size-4" />
          Nuevo restaurante
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Crear restaurante</DialogTitle>
          <DialogDescription>
            BASIC queda activo por {formatMoney(BASIC_PLAN_PRICE_AMOUNT, BASIC_PLAN_CURRENCY)} al mes.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={onSubmit} data-cy="platform-tenant-form">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre restaurante" value={form.name} onChange={onChange('name')} dataCy="platform-tenant-name" />
            <Field label="NIT" value={form.nit} onChange={onChange('nit')} dataCy="platform-tenant-nit" />
            <Field label="Ciudad principal" value={form.municipality} onChange={onChange('municipality')} />
            <Field label="Responsabilidad fiscal" value={form.fiscalResponsibility} onChange={onChange('fiscalResponsibility')} />
            <Field label="Correo owner" type="email" value={form.ownerEmail} onChange={onChange('ownerEmail')} dataCy="platform-tenant-owner-email" />
            <Field label="Nombre owner" value={form.ownerFullName} onChange={onChange('ownerFullName')} />
            <Field label="Password temporal" type="password" value={form.ownerTemporaryPassword} onChange={onChange('ownerTemporaryPassword')} />
            <Field label="Sede inicial" value={form.branchName} onChange={onChange('branchName')} />
            <Field label="Codigo sede" value={form.branchCode} onChange={onChange('branchCode')} />
            <Field label="Direccion sede" value={form.branchAddress} onChange={onChange('branchAddress')} required={false} />
            <Field label="Telefono sede" value={form.branchPhone} onChange={onChange('branchPhone')} required={false} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} data-cy="platform-tenant-submit">
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Crear restaurante
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  dataCy,
  required = true,
}: {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: string;
  dataCy?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase().replaceAll(' ', '-');
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={onChange} required={required} data-cy={dataCy} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  icon: ElementType;
}) {
  return (
    <Card className="platform-card rounded-xl bg-white/90">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid size-11 place-items-center rounded-xl bg-orange/10 text-orange">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="nums mt-1 text-3xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TenantAvatar({ name }: { name: string }) {
  const letters =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'R';
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange text-sm font-bold text-white">
      {letters}
    </span>
  );
}
