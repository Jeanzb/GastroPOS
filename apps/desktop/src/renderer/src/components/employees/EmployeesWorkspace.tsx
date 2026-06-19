import { useMemo, useState, type ChangeEvent } from 'react';
import { KeyRound, Plus, Search, ShieldCheck } from 'lucide-react';
import { DcChip, KpiCard, type DcChipTone } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployees } from '@/hooks/employees';
import { useAppToast } from '@/hooks/ui';
import { formatDate } from '@/lib/format';
import type { EmployeeFormValues } from '@/schemas/employees';
import type { EmployeeDto, UserRole } from '@/types/employees';
import { EmployeeFormDialog } from './EmployeeFormDialog';

const EMPTY_EMPLOYEES: EmployeeDto[] = [];
const SKELETON_ROWS = [0, 1, 2, 3, 4, 5];

const ROLE_META: Record<UserRole, { label: string; tone: DcChipTone }> = {
  OWNER: { label: 'Owner', tone: 'ink' },
  ADMIN: { label: 'Admin', tone: 'ink' },
  CASHIER: { label: 'Cajero', tone: 'success' },
  WAITER: { label: 'Mesero', tone: 'warning' },
  KITCHEN: { label: 'Cocina', tone: 'warning' },
  INVENTORY_MANAGER: { label: 'Inventario', tone: 'success' },
  ACCOUNTANT: { label: 'Contador', tone: 'neutral' },
};

const AVATAR_COLORS = ['#FF5A2C', '#2F8F6B', '#C9892B', '#B5491F', '#1C1A17', '#7C746A'];

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function colorFor(id: string): string {
  const total = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[total % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

function toEmployeePayload(values: EmployeeFormValues) {
  return {
    email: values.email.trim().toLowerCase(),
    fullName: values.fullName.trim(),
    role: values.role,
    temporaryPassword: values.temporaryPassword,
    isActive: values.isActive,
  };
}

function EmployeeCard({
  employee,
  onToggle,
}: {
  employee: EmployeeDto;
  onToggle: (employee: EmployeeDto) => void;
}) {
  const role = ROLE_META[employee.role];

  return (
    <div
      className="motion-press rounded-2xl border border-border bg-card p-[18px] hover:-translate-y-0.5 hover:border-orange/35 hover:shadow-md"
      data-cy="employee-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl font-display text-sm font-bold text-white"
            style={{ background: colorFor(employee.id) }}
          >
            {initials(employee.fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold">{employee.fullName}</p>
            <p className="mt-1 truncate text-[12px] text-[#6B6359]">
              {employee.branchName ?? 'Todas las sedes'}
            </p>
          </div>
        </div>
        <DcChip tone={role.tone}>{role.label}</DcChip>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface-quiet px-3 py-3">
        <div className="min-w-0">
          <p className="text-[11px] text-[#6B6359]">Usuario</p>
          <p className="mt-1 truncate text-[12.5px] font-bold">{employee.email}</p>
        </div>
        <div>
          <p className="text-[11px] text-[#6B6359]">Ultimo acceso</p>
          <p className="nums mt-1 text-[12.5px] font-bold">
            {employee.lastLoginAt ? formatDate(employee.lastLoginAt) : 'Sin ingreso'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[12px] text-[#6B6359]">
          <span
            className="size-2 rounded-full"
            style={{ background: employee.isActive ? '#14865A' : '#B0A89C' }}
          />
          {employee.isActive ? 'Acceso activo' : 'Acceso suspendido'}
        </span>
        <Button
          type="button"
          variant="outline"
          data-cy="employee-toggle-access"
          className={employee.isActive ? 'text-[#C0431A]' : 'text-success'}
          onClick={() => onToggle(employee)}
        >
          {employee.isActive ? 'Suspender' : 'Activar'}
        </Button>
      </div>
    </div>
  );
}

export function EmployeesWorkspace() {
  const appToast = useAppToast();
  const employees = useEmployees();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const employeeList = employees.listQuery.data?.data ?? EMPTY_EMPLOYEES;
  const total = employees.listQuery.data?.meta.total ?? employeeList.length;

  const stats = useMemo(() => {
    const active = employeeList.filter((employee) => employee.isActive).length;
    const waiters = employeeList.filter((employee) => employee.role === 'WAITER').length;
    const privileged = employeeList.filter((employee) =>
      ['OWNER', 'ADMIN', 'ACCOUNTANT'].includes(employee.role),
    ).length;
    return { active, waiters, privileged };
  }, [employeeList]);

  const onSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    employees.setParams((prev) => ({
      ...prev,
      search: value || undefined,
      page: 1,
    }));
  };

  const onSubmit = async (values: EmployeeFormValues) => {
    try {
      await employees.createMutation.mutateAsync(toEmployeePayload(values));
      appToast.success('Empleado creado', `${values.fullName.trim()} ya tiene cuenta operativa.`);
    } catch (error) {
      appToast.error(
        'No se pudo crear el empleado',
        getErrorMessage(error, 'Revisa usuario, rol y contrasena temporal.'),
      );
      throw error;
    }
  };

  const onToggle = async (employee: EmployeeDto) => {
    try {
      await employees.accessMutation.mutateAsync({
        id: employee.id,
        payload: { isActive: !employee.isActive },
      });
      if (employee.isActive) {
        appToast.empleadoSuspendido(employee.fullName);
      } else {
        appToast.success('Acceso activado', `${employee.fullName} ya puede iniciar sesion.`);
      }
    } catch (error) {
      appToast.error(
        'No se pudo cambiar el acceso',
        getErrorMessage(error, 'El backend rechazo el cambio de estado.'),
      );
    }
  };

  return (
    <>
      <div className="space-y-4" data-cy="employees-page">
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard label="Empleados" value={total} hint="Registrados" />
          <KpiCard label="Acceso activo" value={stats.active} hint="Pueden iniciar sesion" accent="success" />
          <KpiCard label="Meseros" value={stats.waiters} hint="Disponibles para mesas" />
          <KpiCard label="Roles criticos" value={stats.privileged} hint="Admin, owner y contador" accent="warning" />
        </div>

        <Card className="gap-4 rounded-2xl border-border/80 bg-surface-raised py-5 shadow-sm">
          <CardHeader className="px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Empleados y accesos</CardTitle>
                <CardDescription>Usuarios reales, roles y permisos validados por el backend</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    appToast.info('Contrasena temporal', 'Crea un empleado nuevo o cambia credenciales desde backend.')
                  }
                >
                  <KeyRound className="size-4" />
                  Accesos
                </Button>
                <Button type="button" data-cy="employees-new" onClick={() => setIsFormOpen(true)}>
                  <Plus className="size-4" />
                  Nuevo empleado
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-cy="employees-search"
                value={employees.params.search ?? ''}
                onChange={onSearch}
                placeholder="Buscar por nombre o usuario"
                className="pl-9"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {employees.listQuery.isLoading
                ? SKELETON_ROWS.map((row) => <Skeleton key={row} className="h-48 rounded-2xl" />)
                : null}

              {!employees.listQuery.isLoading && employeeList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                  No hay empleados registrados para esta busqueda.
                </div>
              ) : null}

              {!employees.listQuery.isLoading
                ? employeeList.map((employee) => (
                    <EmployeeCard key={employee.id} employee={employee} onToggle={onToggle} />
                  ))
                : null}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 rounded-2xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-success">
          <ShieldCheck className="size-4" />
          Los permisos visibles se derivan del rol; el backend valida cada accion critica.
        </div>
      </div>

      <EmployeeFormDialog
        open={isFormOpen}
        isSubmitting={employees.createMutation.isPending}
        onOpenChange={setIsFormOpen}
        onSubmit={onSubmit}
      />
    </>
  );
}
