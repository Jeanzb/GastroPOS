import type { ChangeEventHandler, ElementType, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  Store,
  Warehouse,
} from 'lucide-react';
import { ApiError } from '@/api';
import { PlatformShell, PlatformState, PlatformStatusBadge } from '@/components/platform';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { computeNitVerificationDigit, parseColombianNit } from '@/lib/co-document';
import { BASIC_PLAN_CURRENCY, BASIC_PLAN_PRICE_AMOUNT } from '@/lib/platform-labels';
import { formatMoney } from '@/lib/format';
import type { PlatformTenantDto, TenantStatus } from '@gastroai/contracts';

const EMPTY_TENANT_FORM = {
  name: '',
  nit: '',
  nitVerificationDigit: '',
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

type TenantForm = typeof EMPTY_TENANT_FORM;
type TenantFormErrors = Partial<Record<keyof TenantForm, string>>;

const FIELD_LABELS: Record<keyof TenantForm, string> = {
  name: 'Nombre restaurante',
  nit: 'NIT',
  nitVerificationDigit: 'DV',
  municipality: 'Ciudad principal',
  taxRegime: 'Regimen tributario',
  fiscalResponsibility: 'Responsabilidad fiscal',
  ownerEmail: 'Correo owner',
  ownerFullName: 'Nombre owner',
  ownerTemporaryPassword: 'Password temporal',
  branchName: 'Sede inicial',
  branchCode: 'Codigo sede',
  branchAddress: 'Direccion sede',
  branchPhone: 'Telefono sede',
};

export function PlatformTenantsPage() {
  const toast = useAppToast();
  const tenantsQuery = usePlatformTenants();
  const createTenant = useCreatePlatformTenant();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_TENANT_FORM);
  const [formErrors, setFormErrors] = useState<TenantFormErrors>({});
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
      if (key === 'nit') {
        const value = event.target.value.replace(/\D/g, '').slice(0, 15);
        setForm((current) => ({
          ...current,
          nit: value,
          nitVerificationDigit: computeNitVerificationDigit(value) ?? '',
        }));
        setFormErrors((current) => ({
          ...current,
          nit: undefined,
          nitVerificationDigit: undefined,
        }));
        return;
      }

      const value =
        key === 'branchCode'
          ? normalizeBranchCode(event.target.value)
          : key === 'nitVerificationDigit'
            ? event.target.value.replace(/\D/g, '').slice(0, 1)
            : event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
      setFormErrors((current) => ({ ...current, [key]: undefined }));
    };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { ...form, branchCode: normalizeBranchCode(form.branchCode) };
    const validationErrors = validateTenantForm(payload);
    setForm(payload);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      toast.warning('Corrige los campos marcados', firstFormError(validationErrors));
      return;
    }

    try {
      await createTenant.mutateAsync(payload);
      toast.success('Restaurante creado', 'El cliente quedo activo con plan BASIC.');
      setForm(EMPTY_TENANT_FORM);
      setFormErrors({});
      setIsDialogOpen(false);
    } catch (error) {
      const apiErrors = extractTenantFormErrors(error);
      if (Object.keys(apiErrors).length > 0) {
        setFormErrors(apiErrors);
      }
      const message = firstFormError(apiErrors) ?? (error instanceof Error ? error.message : 'No se pudo crear el restaurante.');
      toast.error('No se pudo crear', message);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setFormErrors({});
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
            errors={formErrors}
            isSubmitting={createTenant.isPending}
            onOpenChange={handleDialogOpenChange}
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
                        data-cy="platform-tenant-status-action"
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
  errors,
  isSubmitting,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean;
  form: typeof EMPTY_TENANT_FORM;
  errors: TenantFormErrors;
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
          {Object.keys(errors).length > 0 ? <TenantFormErrorSummary errors={errors} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre restaurante" value={form.name} error={errors.name} onChange={onChange('name')} dataCy="platform-tenant-name" />
            <NitField
              nit={form.nit}
              verificationDigit={form.nitVerificationDigit}
              nitError={errors.nit}
              verificationDigitError={errors.nitVerificationDigit}
              onNitChange={onChange('nit')}
              onVerificationDigitChange={onChange('nitVerificationDigit')}
            />
            <Field
              label="Ciudad principal"
              value={form.municipality}
              error={errors.municipality}
              onChange={onChange('municipality')}
              dataCy="platform-tenant-municipality"
            />
            <Field
              label="Responsabilidad fiscal"
              value={form.fiscalResponsibility}
              error={errors.fiscalResponsibility}
              onChange={onChange('fiscalResponsibility')}
              dataCy="platform-tenant-fiscal-responsibility"
            />
            <Field label="Correo owner" type="email" value={form.ownerEmail} error={errors.ownerEmail} onChange={onChange('ownerEmail')} dataCy="platform-tenant-owner-email" />
            <Field
              label="Nombre owner"
              value={form.ownerFullName}
              error={errors.ownerFullName}
              onChange={onChange('ownerFullName')}
              dataCy="platform-tenant-owner-name"
            />
            <PasswordField
              label="Password temporal"
              value={form.ownerTemporaryPassword}
              error={errors.ownerTemporaryPassword}
              onChange={onChange('ownerTemporaryPassword')}
              dataCy="platform-tenant-owner-password"
            />
            <Field
              label="Sede inicial"
              value={form.branchName}
              error={errors.branchName}
              onChange={onChange('branchName')}
              dataCy="platform-tenant-branch-name"
            />
            <Field
              label="Codigo sede"
              value={form.branchCode}
              error={errors.branchCode}
              hint="Se guarda en mayusculas. Usa letras, numeros, - o _. Ej: TROPIKOSTA."
              onChange={onChange('branchCode')}
              dataCy="platform-tenant-branch-code"
            />
            <Field
              label="Direccion sede"
              value={form.branchAddress}
              error={errors.branchAddress}
              onChange={onChange('branchAddress')}
              dataCy="platform-tenant-branch-address"
              required={false}
            />
            <Field
              label="Telefono sede"
              value={form.branchPhone}
              error={errors.branchPhone}
              onChange={onChange('branchPhone')}
              dataCy="platform-tenant-branch-phone"
              required={false}
            />
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

function NitField({
  nit,
  verificationDigit,
  nitError,
  verificationDigitError,
  onNitChange,
  onVerificationDigitChange,
}: {
  nit: string;
  verificationDigit: string;
  nitError?: string;
  verificationDigitError?: string;
  onNitChange: ChangeEventHandler<HTMLInputElement>;
  onVerificationDigitChange: ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="nit">NIT</Label>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Input
            id="nit"
            inputMode="numeric"
            value={nit}
            onChange={onNitChange}
            required
            aria-invalid={Boolean(nitError)}
            data-cy="platform-tenant-nit"
            placeholder="900123456"
          />
          {nitError ? <p className="mt-2 text-xs font-medium text-destructive">{nitError}</p> : null}
        </div>
        <div className="w-16 shrink-0">
          <Label htmlFor="nit-dv" className="sr-only">
            Digito de verificacion
          </Label>
          <Input
            id="nit-dv"
            inputMode="numeric"
            maxLength={1}
            value={verificationDigit}
            onChange={onVerificationDigitChange}
            required
            aria-invalid={Boolean(verificationDigitError)}
            className="text-center font-bold"
            data-cy="platform-tenant-nit-dv"
            placeholder="DV"
          />
          {verificationDigitError ? (
            <p className="mt-2 text-center text-xs font-medium text-destructive">
              {verificationDigitError}
            </p>
          ) : null}
        </div>
      </div>
      {!nitError && !verificationDigitError ? (
        <p className="text-xs text-muted-foreground">
          El DV se calcula automaticamente segun la formula DIAN.
        </p>
      ) : null}
    </div>
  );
}

function PasswordField({
  label,
  value,
  error,
  onChange,
  dataCy,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  dataCy?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const id = label.toLowerCase().replaceAll(' ', '-');
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          className="pr-11"
          aria-invalid={Boolean(error)}
          data-cy={dataCy}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? 'Ocultar password temporal' : 'Mostrar password temporal'}
        >
          {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

function Field({
  label,
  value,
  error,
  hint,
  onChange,
  type = 'text',
  dataCy,
  required = true,
}: {
  label: string;
  value: string;
  error?: string;
  hint?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: string;
  dataCy?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase().replaceAll(' ', '-');
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-description` : undefined}
        data-cy={dataCy}
      />
      {error ? (
        <p id={`${id}-description`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function TenantFormErrorSummary({ errors }: { errors: TenantFormErrors }) {
  const entries = Object.entries(errors).filter((entry): entry is [keyof TenantForm, string] =>
    Boolean(entry[1]),
  );
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>Hay campos por corregir</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {entries.map(([field, message]) => (
            <li key={field}>
              <strong>{FIELD_LABELS[field]}:</strong> {message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

function validateTenantForm(input: TenantForm): TenantFormErrors {
  const errors: TenantFormErrors = {};
  const requiredFields: Array<keyof TenantForm> = [
    'name',
    'nit',
    'municipality',
    'ownerEmail',
    'ownerFullName',
    'ownerTemporaryPassword',
    'branchName',
    'branchCode',
  ];

  for (const field of requiredFields) {
    if (!input[field].trim()) {
      errors[field] = `${FIELD_LABELS[field]} es obligatorio.`;
    }
  }

  if (input.ownerTemporaryPassword.trim().length > 0 && input.ownerTemporaryPassword.length < 12) {
    errors.ownerTemporaryPassword = 'Debe tener minimo 12 caracteres.';
  }
  if (input.ownerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.ownerEmail.trim())) {
    errors.ownerEmail = 'Ingresa un correo valido.';
  }
  if (input.nit.trim() && !/^[0-9.-]+$/.test(input.nit.trim())) {
    errors.nit = 'El NIT solo puede tener numeros.';
  }
  const nit = parseColombianNit(input.nit, input.nitVerificationDigit);
  if (input.nit.trim() && !nit) {
    errors.nit = 'Ingresa un NIT valido.';
  } else if (nit && !nit.isValid) {
    errors.nitVerificationDigit = `Debe ser ${nit.expectedVerificationDigit}.`;
  }
  if (input.branchCode.trim() && !/^[A-Z0-9_-]+$/.test(input.branchCode.trim())) {
    errors.branchCode = 'Usa solo mayusculas, numeros, guion o guion bajo.';
  }

  return errors;
}

function extractTenantFormErrors(error: unknown): TenantFormErrors {
  if (!(error instanceof ApiError)) {
    return {};
  }
  const fields = validationFields(error.details);
  const errors: TenantFormErrors = {};

  for (const [field, messages] of Object.entries(fields)) {
    if (isTenantFormField(field) && messages.length > 0) {
      errors[field] = translateValidationMessage(field, messages[0]);
    }
  }

  return errors;
}

function validationFields(details: unknown): Record<string, string[]> {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return {};
  }
  const detailsObject = details as Record<string, unknown>;
  if (detailsObject.fields && typeof detailsObject.fields === 'object' && !Array.isArray(detailsObject.fields)) {
    return normalizeFieldMap(detailsObject.fields as Record<string, unknown>);
  }
  const validation = detailsObject.validation;
  if (!Array.isArray(validation)) {
    return {};
  }
  const fields: Record<string, string[]> = {};
  for (const item of validation) {
    if (typeof item !== 'string') {
      continue;
    }
    const field = Object.keys(FIELD_LABELS).find((key) => item.startsWith(`${key} `));
    if (field) {
      fields[field] = [...(fields[field] ?? []), item];
    }
  }
  return fields;
}

function normalizeFieldMap(fields: Record<string, unknown>): Record<string, string[]> {
  const normalized: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      normalized[field] = value.filter((item): item is string => typeof item === 'string');
    } else if (typeof value === 'string') {
      normalized[field] = [value];
    }
  }
  return normalized;
}

function translateValidationMessage(field: keyof TenantForm, message: string): string {
  if (field === 'ownerTemporaryPassword' && /12|longer than or equal/i.test(message)) {
    return 'Debe tener minimo 12 caracteres.';
  }
  if (field === 'branchCode' && /match|regular expression/i.test(message)) {
    return 'Usa solo mayusculas, numeros, guion o guion bajo. Ej: TROPIKOSTA.';
  }
  if (field === 'ownerEmail' && /email/i.test(message)) {
    return 'Ingresa un correo valido.';
  }
  if (field === 'nit' && /match|regular expression/i.test(message)) {
    return 'El NIT solo puede tener numeros.';
  }
  if (field === 'nitVerificationDigit' && /match|regular expression|digito|verification/i.test(message)) {
    return 'Ingresa el digito de verificacion del NIT.';
  }
  if (/should not be empty|must be longer than or equal to 2/i.test(message)) {
    return `${FIELD_LABELS[field]} es obligatorio.`;
  }
  return message;
}

function isTenantFormField(field: string): field is keyof TenantForm {
  return field in FIELD_LABELS;
}

function normalizeBranchCode(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 20);
}

function firstFormError(errors: TenantFormErrors): string | undefined {
  return Object.values(errors).find(Boolean);
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
