import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { KeyRound, Loader2, ShieldCheck, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { LogoMark, Wordmark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/auth';
import { getTerminalBranch, type TerminalBranch } from '@/lib/terminal-branch';

const loginSchema = z.object({
  email: z.string().email('Ingresa un usuario valido'),
  password: z.string().min(1, 'Ingresa tu contrasena'),
});

type LoginValues = z.infer<typeof loginSchema>;

const pinLoginSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 digitos'),
});

type PinLoginValues = z.infer<typeof pinLoginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const { loginMutation, pinLoginMutation } = useAuth();
  const [mode, setMode] = useState<'password' | 'pin'>('password');
  const [terminalBranch] = useState<TerminalBranch | null>(() => getTerminalBranch());
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const pinForm = useForm<PinLoginValues>({
    resolver: zodResolver(pinLoginSchema),
    defaultValues: { pin: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await loginMutation.mutateAsync({
      email: values.email,
      password: values.password,
    });
    await navigate({ to: '/sede' });
  });

  const onPinSubmit = pinForm.handleSubmit(async (values) => {
    if (!terminalBranch) {
      return;
    }
    await pinLoginMutation.mutateAsync({
      branchId: terminalBranch.id,
      pin: values.pin,
    });
    await navigate({ to: '/' });
  });

  const isPinMode = mode === 'pin';

  return (
    <Card className="w-full max-w-[420px] gap-0 border-border/80 bg-surface-raised py-0 shadow-xl shadow-carbon/10">
      <CardHeader className="space-y-5 p-6 pb-4">
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-white shadow-sm">
            <LogoMark className="h-9 w-9" />
          </div>
          <Wordmark className="text-xl" />
        </div>
        <div>
          <CardTitle className="font-display text-2xl">
            {isPinMode ? 'Acceso rapido POS' : 'Iniciar sesion'}
          </CardTitle>
          <CardDescription className="mt-2">
            {isPinMode
              ? terminalBranch
                ? `Terminal configurada para ${terminalBranch.name}.`
                : 'Primero selecciona una sede con usuario administrador para configurar esta terminal.'
              : 'Entra con tu usuario. La empresa, tenant y sede se cargan desde tu cuenta.'}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0">
        {!isPinMode ? (
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input type="email" autoFocus placeholder="owner@gastroai.local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrasena</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {loginMutation.isError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  No pudimos iniciar sesion. Verifica tus credenciales.
                </p>
              ) : null}

              <Button type="submit" className="h-11 w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Entrar al restaurante
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...pinForm}>
            <form onSubmit={onPinSubmit} className="space-y-4">
              <div className="rounded-xl border border-orange/20 bg-orange/5 px-4 py-3">
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#B5491F]">
                  Terminal POS
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {terminalBranch?.name ?? 'Sin sede configurada'}
                </p>
              </div>

              <FormField
                control={pinForm.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoFocus
                        inputMode="numeric"
                        maxLength={6}
                        pattern="[0-9]*"
                        type="password"
                        data-cy="pin-login-input"
                        placeholder="Ingresa tu PIN"
                        className="h-13 text-center font-display text-2xl tracking-[0.35em]"
                        onChange={(event) =>
                          field.onChange(event.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {pinLoginMutation.isError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  PIN invalido para esta sede.
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={!terminalBranch || pinLoginMutation.isPending}
                data-cy="pin-login-submit"
              >
                {pinLoginMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Entrar al POS
              </Button>
            </form>
          </Form>
        )}

        <Separator className="my-5" />

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          onClick={() => setMode(isPinMode ? 'password' : 'pin')}
        >
          {isPinMode ? <UserRound className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          {isPinMode ? 'Usar usuario y contrasena' : 'Acceso rapido por PIN'}
        </Button>
      </CardContent>
    </Card>
  );
}
