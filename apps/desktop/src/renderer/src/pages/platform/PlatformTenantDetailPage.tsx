import type { ChangeEventHandler, ElementType, FormEvent } from 'react';
import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { CheckCircle2, Loader2, Plus, ShieldAlert, Store, Users } from 'lucide-react';
import type { PlatformTenantDetailDto } from '@gastroai/contracts';
import { PlatformShell, PlatformState, PlatformStatusBadge } from '@/components/platform';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreatePlatformBranch, usePlatformTenant, useUpdateTenantStatus } from '@/hooks/platform';
import { useAppToast } from '@/hooks/ui';
import { BASIC_PLAN_CURRENCY, BASIC_PLAN_PRICE_AMOUNT, featureDescription, featureLabel } from '@/lib/platform-labels';
import { formatMoney } from '@/lib/format';

const EMPTY_BRANCH_FORM = {
  name: '',
  code: '',
  city: '',
  address: '',
  phone: '',
};

export function PlatformTenantDetailPage() {
  const toast = useAppToast();
  const params = useParams({ strict: false }) as { tenantId: string };
  const tenantQuery = usePlatformTenant(params.tenantId);
  const createBranch = useCreatePlatformBranch(params.tenantId);
  const updateStatus = useUpdateTenantStatus(params.tenantId);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [branchForm, setBranchForm] = useState(EMPTY_BRANCH_FORM);
  const tenant = tenantQuery.data;

  const handleBranchChange =
    (key: keyof typeof branchForm): ChangeEventHandler<HTMLInputElement> =>
    (event) => {
      setBranchForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const handleCreateBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createBranch.mutateAsync(branchForm);
      toast.success('Sede creada', 'La nueva sede ya aparece en el restaurante.');
      setBranchForm(EMPTY_BRANCH_FORM);
      setIsBranchDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la sede.';
      toast.error('No se pudo crear sede', message);
    }
  };

  const handleSuspendToggle = async () => {
    if (!tenant) {
      return;
    }
    const nextStatus = tenant.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try {
      await updateStatus.mutateAsync({
        status: nextStatus,
        suspensionReason: nextStatus === 'SUSPENDED' ? 'Suspension manual desde platform' : null,
      });
      toast.success('Estado actualizado', `${tenant.name} quedo actualizado.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cambiar el estado.';
      toast.error('Cambio rechazado', message);
    }
  };

  return (
    <PlatformShell
      title={tenant?.name ?? 'Detalle restaurante'}
      description="Sedes, usuarios, plan BASIC y modulos activos."
    >
      {tenantQuery.isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : tenantQuery.isError || !tenant ? (
        <PlatformState
          title="No se pudo cargar"
          description="El restaurante no existe o la sesion platform no tiene acceso."
          tone="danger"
        />
      ) : (
        <div className="space-y-6">
          <Card className="platform-card rounded-xl bg-white/92">
            <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <TenantAvatar name={tenant.name} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl font-bold">{tenant.name}</h2>
                    <PlatformStatusBadge status={tenant.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    NIT {tenant.nit ?? 'Sin NIT'} - {tenant.municipality ?? 'Ciudad sin registrar'} - BASIC - alta{' '}
                    {new Date(tenant.createdAt).toLocaleDateString('es-CO')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSuspendToggle}
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldAlert className="size-4" />}
                  {tenant.status === 'SUSPENDED' ? 'Reactivar' : 'Suspender'}
                </Button>
                <CreateBranchDialog
                  open={isBranchDialogOpen}
                  form={branchForm}
                  isSubmitting={createBranch.isPending}
                  onOpenChange={setIsBranchDialogOpen}
                  onChange={handleBranchChange}
                  onSubmit={handleCreateBranch}
                />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="branches" className="gap-5">
            <TabsList className="gap-5 border-b border-carbon/10">
              <TabsTrigger value="branches">Sedes</TabsTrigger>
              <TabsTrigger value="plan">Plan y facturacion</TabsTrigger>
              <TabsTrigger value="users">Usuarios</TabsTrigger>
              <TabsTrigger value="settings">Configuracion</TabsTrigger>
            </TabsList>
            <TabsContent value="branches">
              <BranchesTable tenant={tenant} />
            </TabsContent>
            <TabsContent value="plan">
              <PlanPanel tenant={tenant} />
            </TabsContent>
            <TabsContent value="users">
              <UsersTable tenant={tenant} />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsPanel tenant={tenant} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </PlatformShell>
  );
}

function CreateBranchDialog({
  open,
  form,
  isSubmitting,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean;
  form: typeof EMPTY_BRANCH_FORM;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (key: keyof typeof EMPTY_BRANCH_FORM) => ChangeEventHandler<HTMLInputElement>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-carbon text-white hover:bg-carbon/90" data-cy="platform-new-branch">
          <Plus className="size-4" />
          Nueva sede
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear sede</DialogTitle>
          <DialogDescription>La sede queda disponible para usuarios, caja e inventario.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre sede" value={form.name} onChange={onChange('name')} />
            <Field label="Codigo" value={form.code} onChange={onChange('code')} />
            <Field label="Ciudad" value={form.city} onChange={onChange('city')} />
            <Field label="Direccion" value={form.address} onChange={onChange('address')} required={false} />
            <Field label="Telefono" value={form.phone} onChange={onChange('phone')} required={false} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Crear sede
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BranchesTable({ tenant }: { tenant: PlatformTenantDetailDto }) {
  return (
    <Card className="platform-card rounded-xl bg-white/92">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sede</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Direccion</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenant.branches.map((branch) => (
              <TableRow key={branch.id}>
                <TableCell>
                  <p className="font-semibold">{branch.name}</p>
                  <p className="nums text-xs text-muted-foreground">{branch.code}</p>
                </TableCell>
                <TableCell>{branch.city ?? tenant.municipality ?? 'Sin ciudad'}</TableCell>
                <TableCell>{branch.address ?? 'Sin direccion'}</TableCell>
                <TableCell>
                  <Badge className={branch.isActive ? 'bg-emerald-700/10 text-emerald-800' : undefined}>
                    {branch.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PlanPanel({ tenant }: { tenant: PlatformTenantDetailDto }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="platform-card rounded-xl bg-white/92">
        <CardContent className="p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Plan actual</p>
          <h3 className="mt-3 font-display text-3xl font-bold">Basico</h3>
          <p className="nums mt-3 text-4xl font-bold">
            {formatMoney(BASIC_PLAN_PRICE_AMOUNT, BASIC_PLAN_CURRENCY)}
            <span className="ml-1 text-sm font-medium text-muted-foreground">/mes</span>
          </p>
          <div className="mt-6 space-y-3 border-t pt-5 text-sm">
            {['Todas las sedes incluidas', 'Usuarios operativos', 'Facturacion electronica DIAN', 'Reportes basicos y avanzados'].map((item) => (
              <p key={item} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-700" />
                {item}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="platform-card rounded-xl bg-white/92">
        <CardContent className="p-6">
          <h3 className="font-display text-xl font-bold">Modulos incluidos</h3>
          <p className="mt-1 text-sm text-muted-foreground">Nombres visibles para soporte y cliente.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {tenant.features.map((feature) => (
              <div key={feature.code} className="rounded-xl border border-emerald-700/15 bg-emerald-700/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-700" />
                  <p className="font-semibold">{featureLabel(feature.code)}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {featureDescription(feature.code, feature.description)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTable({ tenant }: { tenant: PlatformTenantDetailDto }) {
  return (
    <Card className="platform-card rounded-xl bg-white/92">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Ultimo ingreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenant.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <p className="font-semibold">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.isActive ? 'Activo' : 'Inactivo'}</TableCell>
                <TableCell>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('es-CO') : 'Sin ingreso'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SettingsPanel({ tenant }: { tenant: PlatformTenantDetailDto }) {
  return (
    <Card className="platform-card rounded-xl bg-white/92">
      <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
        <Summary icon={Store} label="Restaurante" value={tenant.name} />
        <Summary icon={ShieldAlert} label="NIT" value={tenant.nit ?? 'Sin NIT'} />
        <Summary icon={Users} label="Usuarios" value={tenant.userCount.toString()} />
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
}) {
  const id = label.toLowerCase().replaceAll(' ', '-');
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={onChange} required={required} />
    </div>
  );
}

function Summary({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/25 p-4">
      <Icon className="mb-3 size-4 text-orange" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
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
    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-orange text-lg font-bold text-white">
      {letters}
    </span>
  );
}
