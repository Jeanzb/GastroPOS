import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { employeePinSchema, type EmployeePinValues } from '@/schemas/employees';
import type { EmployeeDto } from '@/types/employees';

interface EmployeePinDialogProps {
  employee: EmployeeDto | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (employee: EmployeeDto, values: EmployeePinValues) => Promise<void>;
}

const DEFAULT_VALUES: EmployeePinValues = {
  pin: '',
  confirmPin: '',
};

export function EmployeePinDialog({
  employee,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: EmployeePinDialogProps) {
  const form = useForm<EmployeePinValues>({
    resolver: zodResolver(employeePinSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const open = Boolean(employee);

  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES);
    }
  }, [form, open]);

  const submit = form.handleSubmit(async (values) => {
    if (!employee) {
      return;
    }
    await onSubmit(employee, values);
    form.reset(DEFAULT_VALUES);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-orange" />
            Asignar PIN POS
          </DialogTitle>
          <DialogDescription>
            {employee
              ? `${employee.fullName} podra entrar rapido en la terminal de ${employee.branchName ?? 'su sede'}.`
              : 'Configura acceso rapido para la terminal POS.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PIN numerico</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoFocus
                      inputMode="numeric"
                      maxLength={6}
                      pattern="[0-9]*"
                      type="password"
                      data-cy="employee-pin"
                      placeholder="4 a 6 digitos"
                      onChange={(event) =>
                        field.onChange(event.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    El backend lo guarda hasheado y valida unicidad por sede.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar PIN</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="numeric"
                      maxLength={6}
                      pattern="[0-9]*"
                      type="password"
                      data-cy="employee-pin-confirm"
                      placeholder="Repite el PIN"
                      onChange={(event) =>
                        field.onChange(event.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="bg-background"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} data-cy="employee-pin-submit">
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Guardar PIN
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
