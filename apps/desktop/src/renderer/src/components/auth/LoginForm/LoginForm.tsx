import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
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
  email: z.string().email('Ingresa un usuario valido'),
  password: z.string().min(1, 'Ingresa tu contrasena'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const { loginMutation } = useAuth();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await loginMutation.mutateAsync({
      email: values.email,
      password: values.password,
    });
    await navigate({ to: '/sede' });
  });

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
          <CardTitle className="font-display text-2xl">Iniciar sesion</CardTitle>
          <CardDescription className="mt-2">
            Entra con tu usuario. La empresa, tenant y sede se cargan desde tu cuenta.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0">
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

        <Separator className="my-5" />

        <Button variant="outline" className="h-10 w-full" disabled>
          <KeyRound className="h-4 w-4" />
          Acceso rapido por PIN
        </Button>
      </CardContent>
    </Card>
  );
}
