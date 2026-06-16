import { z } from 'zod';

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  sortOrder: z
    .number()
    .int('El orden debe ser un numero entero')
    .min(0, 'El orden no puede ser negativo'),
  isActive: z.boolean(),
});

export const productFormSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  priceAmount: z
    .number()
    .int('El precio debe ser un numero entero')
    .min(0, 'El precio no puede ser negativo'),
  currency: z.string().trim().length(3, 'La moneda debe tener 3 caracteres'),
  categoryId: z.string().optional(),
  sku: z.string().trim().max(64, 'El SKU es demasiado largo').optional(),
  description: z.string().trim().max(1000, 'La descripcion es demasiado larga').optional(),
  isActive: z.boolean(),
  isSellable: z.boolean(),
  isInventoried: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type ProductFormValues = z.infer<typeof productFormSchema>;
