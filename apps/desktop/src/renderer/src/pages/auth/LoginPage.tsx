import { LoginForm } from '@/components/auth';
import { LogoMark, Wordmark } from '@/components/brand';

export function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <LogoMark className="h-10 w-10" />
          <Wordmark className="text-2xl" />
        </div>
        <div className="space-y-3">
          <p className="font-display text-3xl font-semibold leading-tight">
            Inteligencia operativa para restaurantes.
          </p>
          <p className="max-w-sm text-sm text-sidebar-foreground/70">
            Controla ventas, inventario y catálogo desde un solo lugar, con datos
            en los que puedes confiar.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          GastroAI · Operación &amp; Data Restaurantera
        </p>
      </aside>

      <main className="flex items-center justify-center p-6">
        <LoginForm />
      </main>
    </div>
  );
}
