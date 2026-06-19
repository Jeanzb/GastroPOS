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
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-white shadow-lg shadow-black/15">
            <LogoMark className="h-12 w-12" />
          </div>
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

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
          <p className="text-sm font-semibold text-sidebar-foreground">
            Acceso seguro por usuario y sede
          </p>
          <p className="mt-2 max-w-lg text-sm leading-6 text-sidebar-foreground/58">
            Los datos operativos se muestran solo despues de autenticar la cuenta y seleccionar el
            contexto de trabajo correspondiente.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6">
        <LoginForm />
      </main>
    </div>
  );
}
