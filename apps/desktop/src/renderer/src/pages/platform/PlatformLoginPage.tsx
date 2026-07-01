import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { DarkLogoLockup } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppToast } from '@/hooks/ui';
import { usePlatformAuth } from '@/hooks/platform';
import { usePlatformAuthStore } from '@/stores';

export function PlatformLoginPage() {
  const router = useRouter();
  const toast = useAppToast();
  const setSession = usePlatformAuthStore((state) => state.setSession);
  const { loginMutation } = usePlatformAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const session = await loginMutation.mutateAsync({ email, password });
      setSession(session);
      toast.success('Acceso platform activo', 'Sesion global iniciada.');
      void router.navigate({ to: '/platform' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesion.';
      toast.error('Credenciales invalidas', message);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[#171410] p-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,90,44,0.22),transparent_28rem),radial-gradient(circle_at_80%_90%,rgba(20,134,90,0.12),transparent_24rem)]" />
      <Card className="platform-motion-in relative w-full max-w-md border-white/10 bg-[#201c17]/95 text-white shadow-2xl shadow-black/30 backdrop-blur">
        <CardHeader>
          <DarkLogoLockup className="mb-5 h-12 w-auto" />
          <div className="mb-3 grid size-12 place-items-center rounded-xl bg-orange/16 text-orange">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="font-display text-2xl">Panel global GastroAI</CardTitle>
          <CardDescription className="text-white/55">
            Acceso exclusivo para soporte, administracion SaaS y ciclo de vida de clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit}
            autoComplete="off"
            data-cy="platform-login-form"
          >
            <div className="space-y-2">
              <Label htmlFor="platform-email" className="text-white/70">
                Correo
              </Label>
              <Input
                id="platform-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="off"
                placeholder="Correo de plataforma"
                className="border-white/12 bg-white/7 text-white transition focus-visible:border-orange/50"
                data-cy="platform-email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform-password" className="text-white/70">
                Contrasena
              </Label>
              <Input
                id="platform-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Contrasena"
                className="border-white/12 bg-white/7 text-white transition focus-visible:border-orange/50"
                data-cy="platform-password"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-cy="platform-login-submit"
            >
              {loginMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Entrar a plataforma
            </Button>
            <Link
              to="/login"
              className="flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white/55 transition hover:bg-white/7 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/50"
            >
              <ArrowLeft className="size-4" />
              Volver al acceso restaurante
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
