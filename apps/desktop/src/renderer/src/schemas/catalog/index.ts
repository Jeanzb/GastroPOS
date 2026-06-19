import { z } from 'zod';

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  sortOrder: z
    .number()
    .int('El orden debe ser un numero entero')
    .min(0, 'El orden no puede ser negativo'),
  isActive: z.boolean(),
});

export const productIngredientFormSchema = z.object({
  name: z.string().trim().min(2, 'El insumo debe tener al menos 2 caracteres'),
  quantity: z.number().min(0.01, 'La cantidad debe ser mayor a cero'),
  unit: z.string().trim().min(1, 'La unidad es obligatoria').max(16, 'Unidad demasiado larga'),
});

export const productFormSchema = z.object({
  identity: z.object({
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
    sku: z.string().trim().max(64, 'El SKU es demasiado largo').optional(),
    categoryId: z.string().optional(),
  }),
  pricing: z.object({
    amount: z
      .number()
      .int('El precio debe ser un numero entero')
      .min(0, 'El precio no puede ser negativo'),
    currency: z.string().trim().length(3, 'La moneda debe tener 3 caracteres'),
  }),
  details: z.object({
    description: z.string().trim().max(1000, 'La descripcion es demasiado larga').optional(),
  }),
  availability: z.object({
    isActive: z.boolean(),
    isSellable: z.boolean(),
    isInventoried: z.boolean(),
  }),
  recipe: z.object({
    ingredients: z.array(productIngredientFormSchema),
  }),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type ProductFormValues = z.infer<typeof productFormSchema>;
