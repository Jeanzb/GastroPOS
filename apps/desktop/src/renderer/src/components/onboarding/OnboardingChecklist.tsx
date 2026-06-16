import { Check, Circle, Clock3 } from 'lucide-react';
import { StatusPill } from '@/components/operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SETUP_STEPS } from '@/constants';
import { cn } from '@/lib/utils';
import type { SetupStep } from '@/types/operations';

const STEP_STATUS_LABELS: Record<SetupStep['status'], string> = {
  done: 'Listo',
  current: 'Actual',
  pending: 'Pendiente',
};

function SetupStepIcon({ status }: { status: SetupStep['status'] }) {
  if (status === 'done') {
    return <Check className="h-4 w-4" />;
  }

  if (status === 'current') {
    return <Clock3 className="h-4 w-4" />;
  }

  return <Circle className="h-4 w-4" />;
}

function SetupStepRow({ step }: { step: SetupStep }) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-lg border p-4',
        step.status === 'current' ? 'border-orange/35 bg-orange/10' : 'border-border bg-background',
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          step.status === 'done'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-muted text-muted-foreground',
          step.status === 'current' ? 'bg-orange/12 text-orange' : '',
        )}
      >
        <SetupStepIcon status={step.status} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{step.title}</p>
          <StatusPill
            tone={
              step.status === 'done' ? 'green' : step.status === 'current' ? 'orange' : 'neutral'
            }
          >
            {STEP_STATUS_LABELS[step.status]}
          </StatusPill>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
      </div>
    </div>
  );
}

function renderSetupStep(step: SetupStep) {
  return <SetupStepRow key={step.title} step={step} />;
}

export function OnboardingChecklist() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="gap-4 border-border/80 py-5 shadow-none">
        <CardHeader className="px-5">
          <CardTitle>Checklist del MVP</CardTitle>
          <CardDescription>Orden recomendado antes de operar ventas reales</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-5">{SETUP_STEPS.map(renderSetupStep)}</CardContent>
      </Card>

      <aside>
        <Card className="gap-4 border-border/80 py-5 shadow-none">
          <CardHeader className="px-5">
            <CardTitle>Siguiente decision</CardTitle>
            <CardDescription>Completar catalogo antes de POS real</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5">
            <p className="text-sm leading-6 text-muted-foreground">
              La rebanada vertical correcta es login, contexto de sede, categorias y productos.
              Despues se conecta apertura de caja y venta cerrada.
            </p>
            <Button className="w-full" disabled>
              Continuar configuracion
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
