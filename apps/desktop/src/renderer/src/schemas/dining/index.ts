import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max, 'El texto es demasiado largo').optional();

export const openTableAccountSchema = z.object({
  waiterName: optionalText(120),
  guestCount: z
    .number()
    .int('Debe ser un numero entero')
    .min(1, 'Debe ser mayor a cero')
    .max(99, 'Demasiados comensales')
    .optional(),
  customerName: optionalText(160),
});

export const fiscalCustomerSchema = z.object({
  documentType: z.enum(['CC', 'NIT', 'CE', 'PP', 'TI', 'NUIP', 'OTHER']),
  documentNumber: z.string().trim().min(1, 'Documento requerido').max(40),
  name: z.string().trim().min(1, 'Nombre requerido').max(160),
  email: z
    .string()
    .trim()
    .max(160, 'El correo es demasiado largo')
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Correo invalido'),
  phone: optionalText(40),
  address: optionalText(200),
  municipality: optionalText(120),
  taxResponsibility: optionalText(120),
});

export const chargeTableAccountSchema = z
  .object({
    method: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER']),
    amount: z
      .number()
      .int('Debe ser un numero entero')
      .min(0, 'El valor no puede ser negativo'),
    reference: optionalText(120),
    requiresInvoice: z.boolean(),
    customer: fiscalCustomerSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.requiresInvoice && !value.customer) {
      ctx.addIssue({
        code: 'custom',
        path: ['customer'],
        message: 'Los datos fiscales son obligatorios para factura electronica',
      });
    }
  });

export type OpenTableAccountValues = z.infer<typeof openTableAccountSchema>;
export type ChargeTableAccountValues = z.infer<typeof chargeTableAccountSchema>;
