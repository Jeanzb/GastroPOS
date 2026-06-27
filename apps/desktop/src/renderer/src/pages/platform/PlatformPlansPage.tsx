import { CheckCircle2 } from 'lucide-react';
import { PlatformShell, PlatformState } from '@/components/platform';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformPlans } from '@/hooks/platform';
import { BASIC_PLAN_CURRENCY, BASIC_PLAN_PRICE_AMOUNT, featureDescription, featureLabel } from '@/lib/platform-labels';
import { formatMoney } from '@/lib/format';

export function PlatformPlansPage() {
  const plansQuery = usePlatformPlans();
  const basicPlan = (plansQuery.data ?? []).find((plan) => plan.code === 'BASIC');

  return (
    <PlatformShell
      title="Planes y suscripcion"
      description="Catalogo comercial actual de la red GastroAI."
    >
      {plansQuery.isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : plansQuery.isError ? (
        <PlatformState
          title="No se pudieron cargar"
          description="Revisa la sesion platform o la API de planes."
          tone="danger"
        />
      ) : !basicPlan ? (
        <PlatformState title="BASIC no disponible" description="El seed de planes debe crear el plan BASIC." tone="danger" />
      ) : (
        <Card className="platform-card max-w-xl rounded-2xl bg-white/92">
          <CardContent className="p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Plan unico</p>
            <h2 className="mt-3 font-display text-3xl font-bold">Basico</h2>
            <p className="nums mt-4 text-4xl font-bold">
              {formatMoney(BASIC_PLAN_PRICE_AMOUNT, BASIC_PLAN_CURRENCY)}
              <span className="ml-1 text-sm font-medium text-muted-foreground">/mes</span>
            </p>
            <div className="mt-6 border-t pt-5">
              <div className="grid gap-3">
                {basicPlan.features.map((feature) => (
                  <div key={feature.code} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 text-emerald-700" />
                    <div>
                      <p className="font-semibold">{featureLabel(feature.code)}</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {featureDescription(feature.code, feature.description)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <Badge variant="outline">Todos los modulos</Badge>
                <Badge variant="outline">Sin billing automatico</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </PlatformShell>
  );
}
