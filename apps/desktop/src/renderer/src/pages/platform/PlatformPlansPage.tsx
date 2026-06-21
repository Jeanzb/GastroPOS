import { Boxes, CheckCircle2 } from 'lucide-react';
import { PlatformShell, PlatformState } from '@/components/platform';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformPlans } from '@/hooks/platform';

export function PlatformPlansPage() {
  const plansQuery = usePlatformPlans();

  return (
    <PlatformShell
      title="Planes"
      description="Modelo comercial actual: BASIC con todos los modulos incluidos."
    >
      {plansQuery.isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : plansQuery.isError ? (
        <PlatformState
          title="No se pudieron cargar"
          description="Revisa la sesion platform o la API de planes."
          tone="danger"
        />
      ) : (
        <div className="platform-stagger grid gap-4 lg:grid-cols-2">
          {(plansQuery.data ?? []).map((plan) => (
            <Card key={plan.id} className="platform-card rounded-xl bg-white/88">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-emerald-700/10 text-emerald-700">
                    <Boxes className="size-5" />
                  </div>
                  <div>
                    <CardTitle>{plan.code}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-semibold">{plan.name}</p>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  Plan unico con todos los modulos incluidos. Los bloqueos se manejan como overrides de emergencia por tenant.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {plan.features.map((feature) => (
                    <Badge
                      key={feature.code}
                      variant="outline"
                      className="justify-start gap-2 rounded-xl border-emerald-700/15 bg-emerald-700/8 px-3 py-2 text-emerald-800"
                    >
                      <CheckCircle2 className="size-3.5" />
                      {feature.code}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PlatformShell>
  );
}
