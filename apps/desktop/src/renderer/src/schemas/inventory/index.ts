import { z } from 'zod';

const codeSchema = z
  .string()
  .trim()
  .min(1, 'Requerido')
  .max(64, 'Maximo 64 caracteres')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Usa solo letras, numeros, punto, guion o guion bajo');

export const inventoryItemFormSchema = z
  .object({
    branchId: z.string().trim().min(1, 'Selecciona una sede'),
    categoryId: z.string().trim().min(1, 'Selecciona una categoria'),
    name: z.string().trim().min(1, 'Requerido').max(160, 'Maximo 160 caracteres'),
    baseUnitCode: codeSchema.max(16, 'Maximo 16 caracteres'),
    baseUnitName: z.string().trim().max(80, 'Maximo 80 caracteres').optional(),
    productId: z.string().trim().optional().nullable(),
    initialStock: z.number().int().min(0, 'No puede ser negativo').default(0),
    initialUnitCost: z.number().int().min(0, 'No puede ser negativo').default(0),
    minimumStock: z.number().int().min(0, 'No puede ser negativo').default(0),
    allowNegativeStock: z.boolean().default(false),
  })
  .refine((values) => values.initialStock === 0 || values.initialUnitCost > 0, {
    path: ['initialUnitCost'],
    message: 'Requerido si hay stock inicial',
  });

export type InventoryItemFormInput = z.input<typeof inventoryItemFormSchema>;
export type InventoryItemFormValues = z.output<typeof inventoryItemFormSchema>;

export const inventoryAdjustmentFormSchema = z
  .object({
    type: z.enum(['IN', 'OUT']),
    quantity: z.number().int().min(1, 'Debe ser mayor a cero'),
    reason: z.string().trim().min(3, 'Minimo 3 caracteres').max(500, 'Maximo 500 caracteres'),
    unitCost: z.number().int().min(0, 'No puede ser negativo').default(0),
  })
  .refine((values) => values.type === 'OUT' || values.unitCost > 0, {
    path: ['unitCost'],
    message: 'Requerido para entradas',
  });

export type InventoryAdjustmentFormInput = z.input<typeof inventoryAdjustmentFormSchema>;
export type InventoryAdjustmentFormValues = z.output<typeof inventoryAdjustmentFormSchema>;
