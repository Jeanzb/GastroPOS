const foundation = [
  { label: 'Monorepo Bun + Turbo', done: true },
  { label: 'PostgreSQL + Redis (Docker)', done: true },
  { label: 'API NestJS + Swagger', done: true },
  { label: 'Prisma + base multi-tenant', done: true },
  { label: 'Contratos compartidos', done: true },
  { label: 'Shell Electron + React', done: true },
];

const nextUp = 'Login + tenant/sede + CRUD de productos';

export default function App() {
  const bridge = window.gastroai;

  return (
    <div className="flex min-h-full flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 px-10 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-xl">
            🍽️
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">GastroAI</h1>
            <p className="text-sm text-slate-400">
              Inteligencia operativa para restaurantes
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-10 py-12">
        <div>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/20">
            Fase 1 — Foundation lista
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">
            El núcleo operativo está en pie.
          </h2>
          <p className="mt-2 text-slate-400">
            Esta es la base sobre la que se construye el POS, el inventario, la
            caja y los reportes.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {foundation.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-slate-950">
                ✓
              </span>
              {item.label}
            </li>
          ))}
        </ul>

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
          <span className="font-medium text-emerald-300">Siguiente:</span>{' '}
          <span className="text-slate-300">{nextUp}</span>
        </div>
      </main>

      <footer className="border-t border-white/10 px-10 py-4 text-xs text-slate-500">
        Electron {bridge?.versions.electron} · Chromium{' '}
        {bridge?.versions.chrome} · Node {bridge?.versions.node} ·{' '}
        {bridge?.platform}
      </footer>
    </div>
  );
}
