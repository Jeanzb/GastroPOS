/** Catalog response contracts shared by the API and the desktop client. */

export interface ProductCategoryDto {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInventoryLinkDto {
  inventoryItemId: string;
  ingredientId: string;
  sku: string;
  name: string;
  baseUnitCode: string;
}

export interface ProductRecipeIngredientDto {
  ingredientId: string;
  inventoryItemId: string | null;
  sku: string;
  name: string;
  baseUnitCode: string;
  quantity: number;
}

export interface ProductRecipeDto {
  id: string;
  isActive: boolean;
  ingredients: ProductRecipeIngredientDto[];
}

export interface ProductRecipeIngredientPayload {
  ingredientId: string;
  quantity: number;
}

export interface ProductDto {
  id: string;
  categoryId: string | null;
  sku: string | null;
  name: string;
  description: string | null;
  /** Price in integer minor units of `currency` (e.g. COP pesos). Never float. */
  priceAmount: number;
  currency: string;
  isActive: boolean;
  isSellable: boolean;
  isInventoried: boolean;
  inventoryLink: ProductInventoryLinkDto | null;
  recipe: ProductRecipeDto | null;
  createdAt: string;
  updatedAt: string;
}
