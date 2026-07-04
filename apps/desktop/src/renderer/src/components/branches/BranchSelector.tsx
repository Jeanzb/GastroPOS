import { useEffect, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CircleDollarSign,
  LayoutPanelTop,
  LogOut,
  Settings2,
} from 'lucide-react';
import type { BranchDto, UserRole } from '@gastroai/contracts';
import { Logo } from '@/components/brand';
import { DcChip } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/auth';
import { useCashSession } from '@/hooks/cash';
import { useDiningRoom } from '@/hooks/operations';
import { useBranches } from '@/hooks/tenancy';
import { setTerminalBranch } from '@/lib/terminal-branch';
import { cn } from '@/lib/utils';
import { useAuthStore, useOrderStore } from '@/stores';
import type { DiningTableDto } from '@/types/dining';

const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  CASHIER: 'Cajero',
  WAITER: 'Mesero',
  KITCHEN: 'Cocina',
  INVENTORY_MANAGER: 'Inventario',
  ACCOUNTANT: 'Contador',
};

function BranchCard({ branch, onSelect }: { branch: BranchDto; onSelect: () => void }) {
  return (
    <Link
      to="/"
      onClick={() => {
        setTerminalBranch({ id: branch.id, name: branch.name });
        onSelect();
      }}
      className="motion-press group flex min-h-[208px] flex-col rounded-2xl border border-border bg-card p-[22px] text-left hover:-translate-y-1 hover:border-orange/45 hover:shadow-lg hover:shadow-carbon/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-[42px] place-items-center rounded-xl bg-orange/10 font-display text-[15px] font-bold text-[#B5491F]">
          {branchInitials(branch)}
        </span>
        <DcChip tone="success">Activa</DcChip>
      </div>

      <div className="mt-5">
        <h2 className="font-display text-[21px] font-bold leading-tight tracking-tight">
          {branch.name}
        </h2>
        <p className="mt-1 text-[13px] text-[#6B6359]">
          {branch.address ?? branch.city ?? 'Sin dirección registrada'}
        </p>
      </div>

      <div className="mt-auto grid grid-cols-[auto_1fr] gap-x-6 border-t border-[#ECE6DD] pt-4">
        <div>
          <p className="text-[12px] text-[#6B6359]">Código</p>
          <p className="nums text-[14px] font-bold leading-tight">{branch.code}</p>
        </div>
        <div>
          <p className="text-[12px] text-[#6B6359]">Ciudad</p>
          <p className="text-[14px] font-semibold leading-tight text-[#14865A]">
            {branch.city ?? 'No registrada'}
          </p>
        </div>
      </div>
    </Link>
  );
}

function isActiveTable(table: DiningTableDto): boolean {
  return table.status === 'OCCUPIED' || table.status === 'PENDING_BILL';
}

function setBranchContext(branch: BranchDto, onSelect: () => void) {
  setTerminalBranch({ id: branch.id, name: branch.name });
  onSelect();
}

function useSingleBranchMetrics() {
  const diningRoom = useDiningRoom();
  const cash = useCashSession();
  const tables = useMemo(
    () => (diningRoom.zonesQuery.data ?? []).flatMap((zone) => zone.tables),
    [diningRoom.zonesQuery.data],
  );

  return {
    totalTables: tables.length,
    activeTables: tables.filter(isActiveTable).length,
    hasZones: (diningRoom.zonesQuery.data?.length ?? 0) > 0,
    isDiningLoading: diningRoom.zonesQuery.isLoading || diningRoom.zonesQuery.isFetching,
    isCashLoading: cash.activeSessionQuery.isLoading || cash.activeSessionQuery.isFetching,
    isCashOpen: Boolean(cash.activeSessionQuery.data),
  };
}

function StatusLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'neutral';
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-3 last:border-b-0">
      <span className="text-[13px] font-medium text-white/58">{label}</span>
      <span className="flex items-center gap-2 text-[13px] font-bold text-white">
        <span
          className={cn(
            'size-2 rounded-full',
            tone === 'success' && 'bg-[#27C083]',
            tone === 'warning' && 'bg-orange',
            tone === 'neutral' && 'bg-[#A6ADB6]',
          )}
        />
        {value}
      </span>
    </div>
  );
}

function SingleBranchStart({
  branch,
  onSelect,
}: {
  branch: BranchDto;
  onSelect: () => void;
}) {
  const metrics = useSingleBranchMetrics();
  const cashLabel = metrics.isCashLoading
    ? 'Verificando'
    : metrics.isCashOpen
      ? 'Abierta'
      : 'Cerrada';
  const tablesLabel = metrics.isDiningLoading
    ? 'Cargando'
    : metrics.totalTables > 0
      ? `${metrics.totalTables} mesas`
      : 'Sin mesas';
  const serviceLabel = metrics.isDiningLoading
    ? 'Cargando'
    : metrics.activeTables > 0
      ? `${metrics.activeTables} activas`
      : 'Sin cuentas';

  return (
    <section className="mx-auto w-full max-w-[980px]">
      <div className="mb-8 text-center">
        <p className="nums text-[11px] uppercase tracking-[0.18em] text-[#6B6359]">
          Restaurante activo
        </p>
        <h1 className="mt-2 font-display text-[32px] font-bold tracking-tight">
          {branch.name} lista para operar
        </h1>
        <p className="mx-auto mt-2 max-w-[520px] text-[14px] text-[#6B6359]">
          Tu sesión, caja y comandas se registrarán en esta sede única.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
          <div className="flex min-h-[280px] flex-col p-6">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-orange/10 font-display text-[17px] font-bold text-[#B5491F]">
                {branchInitials(branch)}
              </span>
              <div className="flex items-center gap-2">
                <DcChip tone="neutral">Sede única</DcChip>
                <DcChip tone="success">Activa</DcChip>
              </div>
            </div>

            <div className="mt-7">
              <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight">
                {branch.name}
              </h2>
              <p className="mt-1 text-[14px] text-[#6B6359]">
                {branch.address ?? 'Sin dirección registrada'}
              </p>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-5 border-t border-[#ECE6DD] pt-5">
              <div>
                <p className="text-[12px] text-[#6B6359]">Código</p>
                <p className="nums text-[15px] font-bold leading-tight">{branch.code}</p>
              </div>
              <div>
                <p className="text-[12px] text-[#6B6359]">Ciudad</p>
                <p className="text-[15px] font-semibold leading-tight text-[#14865A]">
                  {branch.city ?? 'No registrada'}
                </p>
              </div>
            </div>

            <Button asChild className="mt-6 h-11 rounded-xl">
              <Link to="/" onClick={() => setBranchContext(branch, onSelect)}>
                Entrar a operar
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-[#1C1A17] p-6 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="nums text-[11px] uppercase tracking-[0.18em] text-white/45">
                Estado antes de empezar
              </p>
              <h2 className="mt-2 font-display text-[20px] font-bold">Contexto operativo</h2>
            </div>
            <CircleDollarSign className="size-5 text-orange-soft" />
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4">
            <StatusLine
              label="Caja"
              value={cashLabel}
              tone={metrics.isCashOpen ? 'success' : 'warning'}
            />
            <StatusLine
              label="Salón"
              value={tablesLabel}
              tone={metrics.totalTables > 0 ? 'success' : 'warning'}
            />
            <StatusLine label="POS" value={serviceLabel} tone="neutral" />
          </div>

          {!metrics.hasZones && !metrics.isDiningLoading ? (
            <div className="mt-5 rounded-xl border border-orange/25 bg-orange/10 p-4">
              <div className="flex gap-3">
                <LayoutPanelTop className="mt-0.5 size-4 shrink-0 text-orange-soft" />
                <div>
                  <p className="text-sm font-bold">Configura zonas y mesas</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/58">
                    Esta sede ya está creada, pero todavía no tiene salón operativo.
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                className="mt-4 h-9 border-white/15 bg-white/8 text-white hover:bg-white/12"
              >
                <Link to="/floor" onClick={() => setBranchContext(branch, onSelect)}>
                  <Settings2 className="size-4" />
                  Configurar zonas
                </Link>
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </section>
  );
}

export function BranchSelector() {
  const user = useAuthStore((state) => state.user);
  const setActiveTableId = useOrderStore((state) => state.setActiveTableId);
  const { logout, isLoggingOut } = useAuth();
  const branchesQuery = useBranches();
  const singleBranch =
    branchesQuery.isSuccess && branchesQuery.data.length === 1 ? branchesQuery.data[0] : null;

  useEffect(() => {
    if (!singleBranch) {
      return;
    }

    setTerminalBranch({ id: singleBranch.id, name: singleBranch.name });
    setActiveTableId(null);
  }, [setActiveTableId, singleBranch]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-border bg-background px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[13px] font-bold leading-tight">{user.fullName}</p>
            <p className="text-[12px] text-[#6B6359]">{ROLE_LABELS[user.role]}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={isLoggingOut}
            className="rounded-lg bg-card"
            title="Cerrar sesión"
            onClick={() => void logout()}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="grid flex-1 place-items-center px-6 py-12">
        {singleBranch ? (
          <SingleBranchStart branch={singleBranch} onSelect={() => setActiveTableId(null)} />
        ) : (
          <section className="w-full max-w-[870px]">
          <div className="mb-8 text-center">
            <p className="nums text-[11px] uppercase tracking-[0.18em] text-[#6B6359]">
              Restaurante activo
            </p>
            <h1 className="mt-2 font-display text-[30px] font-bold tracking-tight">
              ¿En qué sede vas a trabajar hoy?
            </h1>
            <p className="mt-2 text-[14px] text-[#6B6359]">
              Tu turno, caja y comandas se asocian a la sede que elijas.
            </p>
          </div>

          {branchesQuery.isLoading ? <BranchGridSkeleton /> : null}

          {branchesQuery.isError ? (
            <Card className="flex min-h-[180px] items-center justify-center gap-3 rounded-2xl border-border bg-card p-6 text-center">
              <AlertCircle className="size-5 text-destructive" />
              <div>
                <p className="font-semibold">No se pudieron cargar las sedes.</p>
                <p className="text-sm text-muted-foreground">
                  Verifica la sesión o intenta de nuevo.
                </p>
              </div>
            </Card>
          ) : null}

          {branchesQuery.isSuccess && branchesQuery.data.length === 0 ? (
            <Card className="grid min-h-[180px] place-items-center rounded-2xl border-border bg-card p-8 text-center">
              <div>
                <Building2 className="mx-auto mb-3 size-6 text-muted-foreground" />
                <p className="font-semibold">Este restaurante no tiene sedes activas.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crea una sede desde el panel de superadmin para poder operar.
                </p>
              </div>
            </Card>
          ) : null}

            {branchesQuery.isSuccess && branchesQuery.data.length > 1 ? (
            <div className="grid gap-[18px] md:grid-cols-3">
              {branchesQuery.data.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  onSelect={() => setActiveTableId(null)}
                />
              ))}
            </div>
          ) : null}
          </section>
        )}
      </main>
    </div>
  );
}

function BranchGridSkeleton() {
  return (
    <div className="grid gap-[18px] md:grid-cols-3">
      {Array.from({ length: 1 }).map((_, index) => (
        <Card key={index} className="min-h-[208px] rounded-2xl border-border bg-card p-[22px]">
          <div className="flex items-start justify-between gap-4">
            <Skeleton className="size-[42px] rounded-xl" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-6 h-6 w-32" />
          <Skeleton className="mt-3 h-4 w-44" />
          <div className="mt-12 grid grid-cols-2 gap-6 border-t border-[#ECE6DD] pt-4">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-24" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function branchInitials(branch: BranchDto): string {
  const code = branch.code.trim();
  if (code.length >= 2) {
    return code.slice(0, 2).toUpperCase();
  }

  return branch.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
