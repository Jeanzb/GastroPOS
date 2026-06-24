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

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3, 'Ingresa un usuario valido')
    .regex(/^[A-Za-z0-9._%+@-]+$/, 'Usuario o correo invalido'),
  password: z.string().min(1, 'Ingresa tu contrasena'),
});

type LoginValues = z.infer<typeof loginSchema>;

const staffLoginSchema = z.object({
  commerce: z.string().min(1, 'Ingresa el nombre del comercio'),
  documentNumber: z.string().regex(/^\d{4,15}$/, 'Ingresa una cédula válida'),
});

type StaffLoginValues = z.infer<typeof staffLoginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const { loginMutation, staffLoginMutation } = useAuth();
  const [mode, setMode] = useState<'password' | 'pin'>('password');
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const staffForm = useForm<StaffLoginValues>({
    resolver: zodResolver(staffLoginSchema),
    defaultValues: { commerce: '', documentNumber: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await loginMutation.mutateAsync({
      email: values.email,
      password: values.password,
    });
    await navigate({ to: '/sede' });
  });

  const onStaffSubmit = staffForm.handleSubmit(async (values) => {
    await staffLoginMutation.mutateAsync({
      commerce: values.commerce,
      documentNumber: values.documentNumber,
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
              ? 'Ingresa el nombre de tu comercio y tu cédula para entrar.'
              : 'Entra con tu usuario. La empresa, tenant y sede se cargan desde tu cuenta.'}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0">
        {!isPinMode ? (
          <Form key="login-password" {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        autoFocus
                        autoCapitalize="none"
                        autoComplete="username"
                        placeholder="jeanzb o owner@gastroai.local"
                        {...field}
                      />
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
          <Form key="login-staff" {...staffForm}>
            <form onSubmit={onStaffSubmit} className="space-y-4">
              <FormField
                control={staffForm.control}
                name="commerce"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comercio</FormLabel>
                    <FormControl>
                      <Input
                        autoFocus
                        type="text"
                        data-cy="staff-login-commerce"
                        placeholder="Nombre del comercio"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={staffForm.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cédula</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        maxLength={15}
                        pattern="[0-9]*"
                        type="text"
                        data-cy="pin-login-input"
                        placeholder="Número de cédula"
                        className="h-13 text-center font-display text-2xl tracking-[0.18em]"
                        onChange={(event) =>
                          field.onChange(event.target.value.replace(/\D/g, '').slice(0, 15))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {staffLoginMutation.isError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Comercio o cédula no válidos.
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={staffLoginMutation.isPending}
                data-cy="pin-login-submit"
              >
                {staffLoginMutation.isPending ? (
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
          {isPinMode ? 'Usar usuario y contraseña' : 'Acceso rápido por cédula'}
        </Button>
      </CardContent>
    </Card>
  );
}
