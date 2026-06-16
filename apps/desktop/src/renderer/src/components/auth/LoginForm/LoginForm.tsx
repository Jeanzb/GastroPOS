import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { LogoMark, Wordmark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/auth';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
  tenantSlug: z.string().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const { loginMutation } = useAuth();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', tenantSlug: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await loginMutation.mutateAsync({
      email: values.email,
      password: values.password,
      tenantSlug: values.tenantSlug ? values.tenantSlug : undefined,
    });
    await navigate({ to: '/' });
  });

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <LogoMark className="h-9 w-9 text-carbon" />
        <Wordmark className="text-xl" />
      </div>

      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Inicia sesión
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Accede a tu panel de operación.
      </p>

      <Form {...form}>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoFocus
                    placeholder="owner@gastroai.local"
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
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tenantSlug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Restaurante (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="gastroai-demo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {loginMutation.isError ? (
            <p className="text-sm text-destructive">
              No pudimos iniciar sesión. Verifica tus credenciales.
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Entrar
          </Button>
        </form>
      </Form>
    </div>
  );
}
