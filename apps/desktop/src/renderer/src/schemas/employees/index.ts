import { z } from 'zod';

export const USER_ROLES = [
  'OWNER',
  'ADMIN',
  'CASHIER',
  'WAITER',
  'KITCHEN',
  'INVENTORY_MANAGER',
  'ACCOUNTANT',
] as const;

export const employeeFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3, 'Ingresa un usuario valido')
    .max(160)
    .regex(/^[A-Za-z0-9._%+@-]+$/, 'Solo letras, numeros y . _ - @'),
  fullName: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(160),
  role: z.enum(USER_ROLES),
  temporaryPassword: z
    .string()
    .min(8, 'La contrasena temporal debe tener al menos 8 caracteres')
    .max(100),
  isActive: z.boolean(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export const employeePinSchema = z
  .object({
    pin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 digitos'),
    confirmPin: z.string().regex(/^\d{4,6}$/, 'Confirma el PIN numerico'),
  })
  .refine((values) => values.pin === values.confirmPin, {
    path: ['confirmPin'],
    message: 'Los PIN no coinciden',
  });

export type EmployeePinValues = z.infer<typeof employeePinSchema>;
