import { Link } from '@tanstack/react-router';
import { AlertCircle, Building2, LogOut } from 'lucide-react';
import type { BranchDto, UserRole } from '@gastroai/contracts';
import { Logo } from '@/components/brand';
import { DcChip } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/auth';
import { useBranches } from '@/hooks/tenancy';
import { setTerminalBranch } from '@/lib/terminal-branch';
import { useAuthStore, useOrderStore } from '@/stores';

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
          {branch.address ?? branch.city ?? 'Sin direccion registrada'}
        </p>
      </div>

      <div className="mt-auto grid grid-cols-[auto_1fr] gap-x-6 border-t border-[#ECE6DD] pt-4">
        <div>
          <p className="text-[12px] text-[#6B6359]">Codigo</p>
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

export function BranchSelector() {
  const user = useAuthStore((state) => state.user);
  const setActiveTableId = useOrderStore((state) => state.setActiveTableId);
  const { logout, isLoggingOut } = useAuth();
  const branchesQuery = useBranches();

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
            title="Cerrar sesion"
            onClick={() => void logout()}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="grid flex-1 place-items-center px-6 py-12">
        <section className="w-full max-w-[870px]">
          <div className="mb-8 text-center">
            <p className="nums text-[11px] uppercase tracking-[0.18em] text-[#9A9286]">
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
                  Verifica la sesion o intenta de nuevo.
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

          {branchesQuery.isSuccess && branchesQuery.data.length > 0 ? (
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
      </main>
    </div>
  );
}

function BranchGridSkeleton() {
  return (
    <div className="grid gap-[18px] md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
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
