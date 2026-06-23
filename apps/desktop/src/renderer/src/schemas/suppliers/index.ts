import { z } from 'zod';

export const supplierFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El proveedor debe tener al menos 2 caracteres')
    .max(160),
  personType: z.enum(['JURIDICA', 'NATURAL']),
  documentType: z.enum(['NIT', 'CC', 'CE', 'PAS']),
  documentNumber: z
    .string()
    .trim()
    .max(20)
    .regex(/^[A-Za-z0-9]*$/, 'Caracteres inválidos')
    .optional(),
  email: z.union([z.string().trim().email('Correo invalido'), z.literal('')]).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(200).optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
