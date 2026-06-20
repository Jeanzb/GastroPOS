import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Loader2, ShieldCheck } from 'lucide-react';
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
  const [email, setEmail] = useState('platform@gastroai.local');
  const [password, setPassword] = useState('PlatformDemo123!');

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
    <main className="grid min-h-screen place-items-center bg-[#171410] p-6 text-white">
      <Card className="w-full max-w-md border-white/10 bg-[#201c17] text-white shadow-2xl shadow-black/30">
        <CardHeader>
          <div className="mb-3 grid size-12 place-items-center rounded-xl bg-orange/16 text-orange">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="font-display text-2xl">Panel global GastroAI</CardTitle>
          <CardDescription className="text-white/55">
            Acceso exclusivo para soporte, administracion SaaS y lifecycle de tenants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit} data-cy="platform-login-form">
            <div className="space-y-2">
              <Label htmlFor="platform-email" className="text-white/70">
                Correo
              </Label>
              <Input
                id="platform-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                className="border-white/12 bg-white/7 text-white"
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
                autoComplete="current-password"
                className="border-white/12 bg-white/7 text-white"
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
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
