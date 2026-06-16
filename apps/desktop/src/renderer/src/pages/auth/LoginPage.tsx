import { CheckCircle2 } from 'lucide-react';
import { LoginForm } from '@/components/auth';
import { LogoMark, Wordmark } from '@/components/brand';

const LOGIN_POINTS = [
  'POS, caja e inventario bajo el mismo contexto de sede.',
  'Datos preparados para auditoria y reportes operativos.',
  'Arquitectura cloud-ready sin secretos en el escritorio.',
];

function renderLoginPoint(point: string) {
  return (
    <li key={point} className="flex items-start gap-3 text-sm text-sidebar-foreground/72">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
      <span>{point}</span>
    </li>
  );
}

export function LoginPage() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_0.9fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <LogoMark className="h-11 w-11" />
          <div>
            <Wordmark className="text-2xl" />
            <p className="mt-1 text-xs text-sidebar-foreground/50">
              Inteligencia operativa para restaurantes
            </p>
          </div>
        </div>

        <div className="max-w-xl space-y-8">
          <div className="space-y-4">
            <p className="max-w-lg font-display text-4xl font-semibold leading-tight">
              El puesto de control para operar restaurantes con datos confiables.
            </p>
            <p className="max-w-md text-sm leading-6 text-sidebar-foreground/66">
              GastroAI centraliza ventas, productos, caja, stock y preparacion fiscal para reducir
              el caos manual del turno.
            </p>
          </div>
          <ul className="space-y-3">{LOGIN_POINTS.map(renderLoginPoint)}</ul>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="nums text-2xl font-semibold">$2.8M</p>
            <p className="mt-1 text-xs text-sidebar-foreground/48">Ventas hoy</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="nums text-2xl font-semibold">64</p>
            <p className="mt-1 text-xs text-sidebar-foreground/48">Tickets</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="nums text-2xl font-semibold">3</p>
            <p className="mt-1 text-xs text-sidebar-foreground/48">Alertas</p>
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6">
        <LoginForm />
      </main>
    </div>
  );
}
