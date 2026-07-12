import { z } from 'zod';
import { computeNitVerificationDigit } from '@/lib/co-document';

export const CUSTOMER_DOCUMENT_TYPES = ['CC', 'NIT', 'CE', 'PP', 'TI', 'NUIP', 'OTHER'] as const;

export const customerFormSchema = z
  .object({
    documentType: z.enum(CUSTOMER_DOCUMENT_TYPES),
    documentNumber: z
      .string()
      .trim()
      .min(1, 'El documento es obligatorio')
      .max(40, 'El documento es demasiado largo'),
    verificationDigit: z.string().trim().regex(/^\d?$/, 'DV invalido').optional(),
    name: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(160, 'El nombre es demasiado largo'),
    email: z.string().trim().min(1, 'El correo es obligatorio').email('Correo invalido'),
    phone: z.string().trim().max(40).optional(),
    address: z
      .string()
      .trim()
      .min(1, 'La direccion es obligatoria')
      .max(200, 'La direccion es demasiado larga'),
    countryCode: z
      .string()
      .trim()
      .length(2, 'Usa el codigo ISO de dos letras')
      .transform((value) => value.toUpperCase()),
    municipality: z.string().trim().max(120).optional(),
    municipalityCode: z.string().trim().optional(),
    taxResponsibility: z.string().trim().max(120).optional(),
    isActive: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.documentType === 'NIT') {
      if (!/^\d+$/.test(values.documentNumber)) {
        context.addIssue({
          code: 'custom',
          path: ['documentNumber'],
          message: 'El NIT solo admite numeros',
        });
      }
      const expected = computeNitVerificationDigit(values.documentNumber);
      if (!values.verificationDigit) {
        context.addIssue({
          code: 'custom',
          path: ['verificationDigit'],
          message: 'El DV es obligatorio para NIT',
        });
      } else if (expected !== values.verificationDigit) {
        context.addIssue({
          code: 'custom',
          path: ['verificationDigit'],
          message: 'El DV no corresponde al NIT',
        });
      }
    }

    if (
      ['CC', 'TI', 'NUIP'].includes(values.documentType) &&
      !/^\d+$/.test(values.documentNumber)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['documentNumber'],
        message: 'Este documento solo admite numeros',
      });
    }

    if (values.countryCode === 'CO' && !/^\d{5}$/.test(values.municipalityCode ?? '')) {
      context.addIssue({
        code: 'custom',
        path: ['municipalityCode'],
        message: 'Ingresa el codigo DIVIPOLA de cinco digitos',
      });
    }
  });

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
