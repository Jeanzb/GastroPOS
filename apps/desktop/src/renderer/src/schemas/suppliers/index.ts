import { z } from 'zod';

export const supplierFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El proveedor debe tener al menos 2 caracteres')
    .max(160),
  documentType: z.enum(['NIT', 'CC']),
  documentNumber: z
    .string()
    .trim()
    .max(20)
    .regex(/^\d*$/, 'Solo números')
    .optional(),
  email: z.union([z.string().trim().email('Correo invalido'), z.literal('')]).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(200).optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
