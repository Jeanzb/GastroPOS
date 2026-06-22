import { z } from 'zod';

export const purchaseItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El insumo debe tener al menos 2 caracteres')
    .max(160, 'El nombre es demasiado largo'),
  quantity: z.number().int().min(1, 'La cantidad debe ser mayor a cero'),
  unitCost: z.number().int().min(0, 'El costo no puede ser negativo'),
});

export const purchaseFormSchema = z.object({
  supplierId: z.string().trim().min(1, 'Selecciona un proveedor'),
  reference: z.string().trim().max(80, 'La referencia es demasiado larga').optional(),
  notes: z.string().trim().max(500, 'Las notas son demasiado largas').optional(),
  taxTotal: z.number().int().min(0, 'El impuesto no puede ser negativo'),
  items: z.array(purchaseItemSchema).min(1, 'Agrega al menos un insumo'),
});

export type PurchaseItemValues = z.infer<typeof purchaseItemSchema>;
export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;
