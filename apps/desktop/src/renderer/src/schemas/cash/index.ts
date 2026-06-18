import { z } from 'zod';

export const openCashSessionSchema = z.object({
  openingBalance: z
    .number()
    .int('La base debe ser un valor entero')
    .min(0, 'La base no puede ser negativa'),
  notes: z.string().trim().max(500, 'La nota es demasiado larga').optional(),
});

export const cashMovementSchema = z.object({
  type: z.enum(['CASH_IN', 'CASH_OUT', 'SALE_PAYMENT', 'REFUND', 'TIP', 'ADJUSTMENT']),
  amount: z.number().int('El valor debe ser entero').min(1, 'El valor debe ser mayor a cero'),
  reference: z.string().trim().max(120, 'La referencia es demasiado larga').optional(),
  notes: z.string().trim().max(500, 'La nota es demasiado larga').optional(),
});

export const closeCashSessionSchema = z.object({
  countedAmount: z
    .number()
    .int('El conteo debe ser entero')
    .min(0, 'El conteo no puede ser negativo'),
  notes: z.string().trim().max(500, 'La nota es demasiado larga').optional(),
});

export type OpenCashSessionFormValues = z.infer<typeof openCashSessionSchema>;
export type CashMovementFormValues = z.infer<typeof cashMovementSchema>;
export type CloseCashSessionFormValues = z.infer<typeof closeCashSessionSchema>;
