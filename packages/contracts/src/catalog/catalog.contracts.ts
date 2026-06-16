/** Catalog response contracts shared by the API and the desktop client. */

export interface ProductCategoryDto {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}
