import type { ChangeEventHandler, FormEvent } from 'react';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Building2, Loader2, Plus, Search, Users } from 'lucide-react';
import { PlatformShell, PlatformState, PlatformStatusBadge } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useAppToast } from '@/hooks/ui';
import { useCreatePlatformTenant, usePlatformTenants, useUpdateTenantStatus } from '@/hooks/platform';
import type { PlatformTenantDto, TenantStatus } from '@gastroai/contracts';

const EMPTY_TENANT_FORM = {
  name: '',
  slug: '',
  ownerEmail: '',
  ownerFullName: '',
  ownerTemporaryPassword: '',
  branchName: 'Principal',
  branchCode: 'MAIN',
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
  const tenants = (tenantsQuery.data ?? []).filter((tenant) => {
    const needle = search.trim().toLowerCase();
    return (
      !needle ||
      tenant.name.toLowerCase().includes(needle) ||
      tenant.slug.toLowerCase().includes(needle)
    );
  });

  const handleChange = (key: keyof typeof form) => (event: Parameters<ChangeEventHandler<HTMLInputElement>>[0]) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createTenant.mutateAsync(form);
      toast.success('Tenant creado', 'El restaurante quedo activo con plan BASIC.');
      setForm(EMPTY_TENANT_FORM);
      setIsDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el tenant.';
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
      toast.success('Estado actualizado', `${selectedTenantAction.tenant.name} quedo ${selectedTenantAction.status}.`);
      setSelectedTenantAction(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cambiar el estado.';
      toast.error('Cambio rechazado', message);
    }
  };

  return (
    <PlatformShell
      title="Restaurantes"
      description="Gestiona tenants, estado operativo, sedes y propietarios."
    >
      <Card className="platform-card rounded-xl bg-white/88">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Todos los restaurantes registrados en GastroAI.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-cy="platform-new-tenant">
                <Plus className="size-4" />
                Nuevo tenant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear restaurante</DialogTitle>
                <DialogDescription>
                  Se asigna automaticamente el plan BASIC y una sede inicial.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleCreate} data-cy="platform-tenant-form">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre" value={form.name} onChange={handleChange('name')} dataCy="platform-tenant-name" />
                  <Field label="Slug" value={form.slug} onChange={handleChange('slug')} dataCy="platform-tenant-slug" />
                  <Field
                    label="Correo owner"
                    type="email"
                    value={form.ownerEmail}
                    onChange={handleChange('ownerEmail')}
                    dataCy="platform-tenant-owner-email"
                  />
                  <Field
                    label="Nombre owner"
                    value={form.ownerFullName}
                    onChange={handleChange('ownerFullName')}
                    dataCy="platform-tenant-owner-name"
                  />
                  <Field
                    label="Password temporal"
                    type="password"
                    value={form.ownerTemporaryPassword}
                    onChange={handleChange('ownerTemporaryPassword')}
                    dataCy="platform-tenant-owner-password"
                  />
                  <Field
                    label="Sede"
                    value={form.branchName}
                    onChange={handleChange('branchName')}
                    dataCy="platform-tenant-branch-name"
                  />
                  <Field
                    label="Codigo sede"
                    value={form.branchCode}
                    onChange={handleChange('branchCode')}
                    dataCy="platform-tenant-branch-code"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createTenant.isPending} data-cy="platform-tenant-submit">
                    {createTenant.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Crear tenant
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2 rounded-xl border bg-background/80 px-3 py-2 shadow-sm transition focus-within:border-orange/40 focus-within:bg-white">
            <Search className="size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o slug"
              className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              data-cy="platform-tenant-search"
            />
          </div>
          {tenantsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          ) : tenantsQuery.isError ? (
            <PlatformState
              title="No se pudieron cargar"
              description="La sesion platform no pudo consultar los tenants."
              tone="danger"
            />
          ) : tenants.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurante</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Sedes</TableHead>
                  <TableHead>Usuarios</TableHead>
                  <TableHead className="text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id} className="platform-row" data-cy="platform-tenant-row">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-lg bg-orange/10 text-orange">
                          <Building2 className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PlatformStatusBadge status={tenant.status} />
                    </TableCell>
                    <TableCell>{tenant.planCode ?? 'Sin plan'}</TableCell>
                    <TableCell>
                      <span className="nums font-semibold">{tenant.branchCount}</span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5 text-muted-foreground" />
                        <span className="nums font-semibold">{tenant.userCount}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to="/platform/tenants/$tenantId" params={{ tenantId: tenant.id }}>
                            Ver detalle
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant={tenant.status === 'SUSPENDED' ? 'default' : 'destructive'}
                          size="sm"
                          onClick={() =>
                            setSelectedTenantAction({
                              tenant,
                              status: tenant.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
                            })
                          }
                          data-cy="platform-tenant-status-action"
                        >
                          {tenant.status === 'SUSPENDED' ? 'Reactivar' : 'Suspender'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <PlatformState
              title={search.trim() ? 'Sin resultados' : 'Aun no hay restaurantes'}
              description={
                search.trim()
                  ? 'Ajusta la busqueda para encontrar otro tenant.'
                  : 'Crea el primer tenant para activar el panel SaaS.'
              }
            />
          )}
        </CardContent>
      </Card>
      <Dialog open={Boolean(selectedTenantAction)} onOpenChange={(open) => !open && setSelectedTenantAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar estado del tenant</DialogTitle>
            <DialogDescription>
              Esta accion actualiza el cache de acceso y afecta las operaciones del restaurante.
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

function Field({
  label,
  value,
  onChange,
  type = 'text',
  dataCy,
}: {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: string;
  dataCy?: string;
}) {
  const id = label.toLowerCase().replaceAll(' ', '-');
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={onChange} required data-cy={dataCy} />
    </div>
  );
}
