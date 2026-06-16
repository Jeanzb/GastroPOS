import { Link } from '@tanstack/react-router';
import { ArrowRight, Building2, CircleDollarSign, Utensils } from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BRANCH_OPTIONS } from '@/constants';
import type { BranchOption } from '@/types/operations';

function BranchCard({ branch }: { branch: BranchOption }) {
  return (
    <Card className="gap-5 border-border/80 py-5 shadow-none transition-colors hover:border-orange/40">
      <CardHeader className="px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange/12 font-display text-sm font-semibold text-orange">
              {branch.initials}
            </div>
            <div>
              <CardTitle className="text-base">{branch.name}</CardTitle>
              <CardDescription>{branch.address}</CardDescription>
            </div>
          </div>
          <StatusPill tone={branch.statusTone}>{branch.serviceStatus}</StatusPill>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/35 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Utensils className="h-3.5 w-3.5" />
              Mesas
            </div>
            <p className="nums mt-2 text-xl font-semibold">{branch.tables}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/35 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CircleDollarSign className="h-3.5 w-3.5" />
              Caja
            </div>
            <p className="mt-2 text-sm font-semibold">{branch.cashStatus}</p>
          </div>
        </div>
        <Button asChild className="w-full">
          <Link to="/">
            Entrar a la sede
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function renderBranchCard(branch: BranchOption) {
  return <BranchCard key={branch.name} branch={branch} />;
}

export function BranchSelector() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Selecciona la sede operativa
          </h1>
          <p className="text-sm text-muted-foreground">
            Este contexto se usara para POS, caja, inventario, reportes y fiscal.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">{BRANCH_OPTIONS.map(renderBranchCard)}</div>
    </div>
  );
}
