import { Link } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/brand';
import { DcChip } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { BRANCH_OPTIONS } from '@/constants';
import { useAuth } from '@/hooks/auth';
import { useAuthStore } from '@/stores';
import type { BranchOption } from '@/types/operations';

function BranchCard({ branch }: { branch: BranchOption }) {
  return (
    <Link
      to="/"
      className="motion-press group flex min-h-[208px] flex-col rounded-2xl border border-border bg-card p-[22px] text-left hover:-translate-y-1 hover:border-orange/45 hover:shadow-lg hover:shadow-carbon/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-[42px] place-items-center rounded-xl bg-orange/10 font-display text-[15px] font-bold text-[#B5491F]">
          {branch.initials}
        </span>
        <DcChip tone={branch.statusTone === 'green' ? 'success' : 'warning'}>
          {branch.serviceStatus}
        </DcChip>
      </div>

      <div className="mt-5">
        <h2 className="font-display text-[21px] font-bold leading-tight tracking-tight">
          {branch.name}
        </h2>
        <p className="mt-1 text-[13px] text-[#6B6359]">{branch.address}</p>
      </div>

      <div className="mt-auto grid grid-cols-[auto_1fr] gap-x-6 border-t border-[#ECE6DD] pt-4">
        <div>
          <p className="text-[12px] text-[#6B6359]">Mesas</p>
          <p className="nums text-[14px] font-bold leading-tight">{branch.tables}</p>
        </div>
        <div>
          <p className="text-[12px] text-[#6B6359]">Caja</p>
          <p className="text-[14px] font-semibold leading-tight text-[#14865A]">
            {branch.cashStatus}
          </p>
        </div>
      </div>
    </Link>
  );
}

function renderBranchCard(branch: BranchOption) {
  return <BranchCard key={branch.name} branch={branch} />;
}

export function BranchSelector() {
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-border bg-background px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[13px] font-bold leading-tight">{user?.fullName ?? 'Usuario demo'}</p>
            <p className="text-[12px] text-[#6B6359]">Administrador</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
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
              Restaurante La Sazon
            </p>
            <h1 className="mt-2 font-display text-[30px] font-bold tracking-tight">
              ¿En qué sede vas a trabajar hoy?
            </h1>
            <p className="mt-2 text-[14px] text-[#6B6359]">
              Tu turno, caja y comandas se asocian a la sede que elijas.
            </p>
          </div>

          <div className="grid gap-[18px] md:grid-cols-3">
            {BRANCH_OPTIONS.map(renderBranchCard)}
          </div>
        </section>
      </main>
    </div>
  );
}
