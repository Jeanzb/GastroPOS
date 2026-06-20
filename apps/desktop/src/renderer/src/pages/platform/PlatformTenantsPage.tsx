import type { ChangeEventHandler, FormEvent } from 'react';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Loader2, Plus } from 'lucide-react';
import { PlatformShell } from '@/components/platform';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppToast } from '@/hooks/ui';
import { useCreatePlatformTenant, usePlatformTenants } from '@/hooks/platform';

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

  return (
    <PlatformShell
      title="Restaurantes"
      description="Gestiona tenants, estado operativo, sedes y propietarios."
    >
      <Card>
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
          {tenantsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando restaurantes...</p>
          ) : tenantsQuery.isError ? (
            <p className="text-sm text-destructive">No se pudieron cargar los tenants.</p>
          ) : tenantsQuery.data?.length ? (
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
                {tenantsQuery.data.map((tenant) => (
                  <TableRow key={tenant.id} data-cy="platform-tenant-row">
                    <TableCell>
                      <p className="font-semibold">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                    </TableCell>
                    <TableCell>{tenant.status}</TableCell>
                    <TableCell>{tenant.planCode ?? 'Sin plan'}</TableCell>
                    <TableCell>{tenant.branchCount}</TableCell>
                    <TableCell>{tenant.userCount}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/platform/tenants/$tenantId" params={{ tenantId: tenant.id }}>
                          Ver detalle
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="font-semibold">Aun no hay restaurantes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crea el primer tenant para activar el panel SaaS.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
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
