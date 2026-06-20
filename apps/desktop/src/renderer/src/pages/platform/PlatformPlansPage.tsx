import { PlatformShell } from '@/components/platform';
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
        <p className="text-sm text-destructive">No se pudieron cargar los planes.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(plansQuery.data ?? []).map((plan) => (
            <Card key={plan.id} className="rounded-xl">
              <CardHeader>
                <CardTitle>{plan.code}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-semibold">{plan.name}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {plan.features.map((feature) => (
                    <Badge key={feature.code} className="bg-carbon text-white">
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
