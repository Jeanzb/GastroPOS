import { z } from 'zod';
import { parseColombianNit } from '@gastroai/contracts';

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
  verificationDigit: z
    .string()
    .trim()
    .regex(/^\d?$/, 'DV inválido')
    .optional(),
  email: z.union([z.string().trim().email('Correo invalido'), z.literal('')]).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(200).optional(),
}).superRefine((value, ctx) => {
  if (value.documentType !== 'NIT') {
    return;
  }

  const nit = parseColombianNit(value.documentNumber ?? '', value.verificationDigit);
  if (!nit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['documentNumber'],
      message: 'Ingresa un NIT valido',
    });
    return;
  }
  if (!nit.isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['verificationDigit'],
      message: `El DV debe ser ${nit.expectedVerificationDigit}`,
    });
  }
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
