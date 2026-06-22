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
  ingredientId: z.string().trim().min(1, 'Selecciona un insumo'),
  // Amount in the chosen `unitCode`; converted to the ingredient base unit on submit.
  quantity: z.number().positive('Debe ser mayor a cero'),
  unitCode: z.string().trim().min(1),
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
