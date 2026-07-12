import { z } from 'zod';

export const fiscalProfileFormSchema = z
  .object({
    legalName: z.string().trim().min(2, 'La razon social es obligatoria'),
    nit: z.string().trim().min(5, 'El NIT es obligatorio'),
    taxRegime: z.string().trim().optional(),
    fiscalResponsibilities: z.string().trim().optional(),
    municipality: z.string().trim().optional(),
    address: z.string().trim().optional(),
    invoiceResolutionNumber: z.string().trim().optional(),
    invoiceResolutionPrefix: z.string().trim().max(12, 'El prefijo es muy largo').optional(),
    numberingRangeFrom: z.number().int().min(1).optional(),
    numberingRangeTo: z.number().int().min(1).optional(),
    numberingValidFrom: z.string().trim().optional(),
    numberingValidUntil: z.string().trim().optional(),
    numberingRangeId: z.number().int().min(1).optional(),
    creditNoteNumberingRangeId: z.number().int().min(1).optional(),
  })
  .refine(
    (values) =>
      values.numberingRangeFrom === undefined ||
      values.numberingRangeTo === undefined ||
      values.numberingRangeFrom <= values.numberingRangeTo,
    {
      path: ['numberingRangeTo'],
      message: 'El final del rango debe ser mayor o igual al inicio',
    },
  );

export type FiscalProfileFormValues = z.infer<typeof fiscalProfileFormSchema>;

export const factusConnectionFormSchema = z.object({
  environment: z.enum(['SANDBOX', 'PRODUCTION']),
  baseUrl: z.string().trim().url('Ingresa una URL valida').optional().or(z.literal('')),
  clientId: z.string().trim().min(1, 'Client ID requerido').max(240),
  clientSecret: z.string().min(1, 'Client secret requerido').max(500),
  username: z.string().trim().email('Correo de Factus invalido').max(254),
  password: z.string().min(1, 'Contrasena requerida').max(500),
});

export type FactusConnectionFormValues = z.infer<typeof factusConnectionFormSchema>;
