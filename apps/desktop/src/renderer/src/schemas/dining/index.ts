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
  dv: z.string().trim().regex(/^\d?$/, 'DV invalido').optional(),
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
  municipalityCode: z.string().trim().regex(/^\d{5}$/, 'Usa el codigo DIVIPOLA de cinco digitos').optional(),
  countryCode: z.literal('CO').optional(),
  taxResponsibility: optionalText(120),
}).superRefine((value, ctx) => {
  if (['CC', 'NIT'].includes(value.documentType) && !/^\d+$/.test(value.documentNumber)) {
    ctx.addIssue({ code: 'custom', path: ['documentNumber'], message: 'Este tipo de documento solo admite numeros' });
  }
  if (value.documentType === 'NIT' && !value.dv) {
    ctx.addIssue({ code: 'custom', path: ['dv'], message: 'El NIT requiere DV' });
  }
});

export const chargeTableAccountSchema = z
  .object({
    fiscalRecipient: z.enum(['CONSUMER_FINAL', 'IDENTIFIED']),
    method: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER']),
    factusPaymentMethodCode: z.enum(['10', '42', '20', '47', '71', '72', '1', '49', '48', 'ZZZ']).optional(),
    amount: z
      .number()
      .int('Debe ser un numero entero')
      .min(0, 'El valor no puede ser negativo'),
    reference: optionalText(120),
    customer: fiscalCustomerSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.fiscalRecipient === 'IDENTIFIED' && !value.customer) {
      ctx.addIssue({
        code: 'custom',
        path: ['customer'],
        message: 'Los datos fiscales son obligatorios para cliente identificado',
      });
    }
    if (value.fiscalRecipient === 'IDENTIFIED' && value.customer) {
      const required: Array<keyof typeof value.customer> = ['email', 'phone', 'address', 'municipalityCode'];
      for (const field of required) {
        if (!value.customer[field]) {
          ctx.addIssue({ code: 'custom', path: ['customer', field], message: 'Campo requerido para facturacion fiscal' });
        }
      }
    }
  });

export type OpenTableAccountValues = z.infer<typeof openTableAccountSchema>;
export type ChargeTableAccountValues = z.infer<typeof chargeTableAccountSchema>;
