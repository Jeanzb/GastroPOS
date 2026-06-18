import { z } from 'zod';

export const CUSTOMER_DOCUMENT_TYPES = [
  'CC',
  'NIT',
  'CE',
  'PP',
  'TI',
  'NUIP',
  'OTHER',
] as const;

export const customerFormSchema = z.object({
  documentType: z.enum(CUSTOMER_DOCUMENT_TYPES),
  documentNumber: z
    .string()
    .trim()
    .min(1, 'El documento es obligatorio')
    .max(40, 'El documento es demasiado largo'),
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(160, 'El nombre es demasiado largo'),
  email: z.union([z.string().trim().email('Correo invalido'), z.literal('')]).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(200).optional(),
  municipality: z.string().trim().max(120).optional(),
  taxResponsibility: z.string().trim().max(120).optional(),
  isActive: z.boolean(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
