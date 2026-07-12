import type { ProductDto } from '@gastroai/contracts';
import type { InventoryBalance, InventoryIngredient, Product, ProductRecipe, ProductRecipeIngredient, UnitOfMeasure } from '../../../../generated/prisma';

export type ProductWithInventory = Product & {
  inventoryIngredients: Array<
    InventoryIngredient & {
      baseUnit: Pick<UnitOfMeasure, 'code'>;
      balances: Array<Pick<InventoryBalance, 'id'>>;
    }
  >;
  recipes: Array<
    ProductRecipe & {
        ingredients: Array<
          ProductRecipeIngredient & {
            ingredient: InventoryIngredient & {
              baseUnit: Pick<UnitOfMeasure, 'code'>;
              balances: Array<Pick<InventoryBalance, 'id'>>;
            };
          }
        >;
      }
  >;
};

export function toProductDto(product: ProductWithInventory): ProductDto {
  const inventoryLink = product.inventoryIngredients[0] ?? null;
  const activeRecipe =
    product.recipes.find((recipe) => recipe.isActive && !recipe.deletedAt) ?? null;

  return {
    id: product.id,
    categoryId: product.categoryId,
    taxCategoryId: product.taxCategoryId,
    sku: product.sku,
    name: product.name,
    description: product.description,
    priceAmount: product.priceAmount,
    currency: product.currency,
    fiscalName: product.fiscalName,
    fiscalCodeReference: product.fiscalCodeReference,
    unitMeasureCode: product.unitMeasureCode,
    standardCode: product.standardCode,
    isExcluded: product.isExcluded,
    incApplies: product.incApplies,
    isActive: product.isActive,
    isSellable: product.isSellable,
    isInventoried: product.isInventoried,
    inventoryLink: inventoryLink
      ? {
          inventoryItemId: inventoryLink.balances[0]?.id ?? '',
          ingredientId: inventoryLink.id,
          sku: inventoryLink.sku,
          name: inventoryLink.name,
          baseUnitCode: inventoryLink.baseUnit.code,
        }
      : null,
    recipe: activeRecipe
      ? {
          id: activeRecipe.id,
          isActive: activeRecipe.isActive,
          ingredients: activeRecipe.ingredients.map((recipeIngredient) => ({
            ingredientId: recipeIngredient.ingredientId,
            inventoryItemId: recipeIngredient.ingredient.balances[0]?.id ?? null,
            sku: recipeIngredient.ingredient.sku,
            name: recipeIngredient.ingredient.name,
            baseUnitCode: recipeIngredient.ingredient.baseUnit.code,
            quantity: recipeIngredient.quantity,
          })),
        }
      : null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
