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
    providerType: z.enum(['DIAN_DIRECT', 'TECHNOLOGY_PROVIDER', 'API_PROVIDER']),
    providerName: z.string().trim().optional(),
    environment: z.enum(['TEST', 'PRODUCTION']),
    endpointUrl: z.string().trim().optional(),
    softwareId: z.string().trim().optional(),
    certificateAlias: z.string().trim().optional(),
    accountId: z.string().trim().optional(),
    apiKeyRef: z.string().trim().optional(),
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
