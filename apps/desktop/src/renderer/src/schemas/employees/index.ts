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
  email: z.string().trim().email('Ingresa un correo valido').max(160),
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
