import { Injectable } from '@nestjs/common';
import { StockMovementType, type Prisma } from '../../../generated/prisma';

export interface InventorySaleItem {
  productId: string | null;
  nameSnapshot: string;
  quantity: number;
}

export interface ConsumeSaleInventoryData {
  tenantId: string;
  branchId: string;
  saleId: string;
  items: InventorySaleItem[];
  actorUserId: string;
}

export type ConsumeSaleInventoryResult =
  | { status: 'OK' }
  | { status: 'INSUFFICIENT_STOCK'; itemName: string }
  | { status: 'INVENTORY_NOT_CONFIGURED'; itemName: string };

interface PendingDeduction {
  balanceId: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  stockBefore: number;
  allowNegativeStock: boolean;
}

@Injectable()
export class InventoryConsumptionService {
  async consumeSaleItems(
    tx: Prisma.TransactionClient,
    data: ConsumeSaleInventoryData,
  ): Promise<ConsumeSaleInventoryResult> {
    const deductions = new Map<string, PendingDeduction>();

    for (const item of data.items) {
      if (!item.productId) {
        continue;
      }

      const product = await tx.product.findFirst({
        where: {
          id: item.productId,
          tenantId: data.tenantId,
          deletedAt: null,
          isActive: true,
        },
        include: {
          recipes: {
            where: { deletedAt: null },
            take: 1,
            include: {
              ingredients: {
                include: {
                  ingredient: { select: { id: true, name: true, isActive: true, deletedAt: true } },
                },
              },
            },
          },
        },
      });

      if (!product?.isInventoried) {
        continue;
      }

      const recipe = product.recipes.find((item) => item.isActive && !item.deletedAt) ?? null;
      const recipeIngredients =
        recipe?.ingredients.filter(
          (ingredient) => ingredient.ingredient.isActive && !ingredient.ingredient.deletedAt,
        ) ?? [];

      if (recipeIngredients.length > 0) {
        for (const recipeIngredient of recipeIngredients) {
          const result = await this.addDeduction(tx, data, deductions, {
            ingredientId: recipeIngredient.ingredientId,
            quantity: recipeIngredient.quantity * item.quantity,
            itemName: recipeIngredient.ingredient.name,
          });
          if (result.status !== 'OK') {
            return result;
          }
        }
        continue;
      }

      const linkedIngredient = await tx.inventoryIngredient.findFirst({
        where: {
          tenantId: data.tenantId,
          productId: item.productId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true, name: true },
      });

      if (!linkedIngredient) {
        return { status: 'INVENTORY_NOT_CONFIGURED', itemName: item.nameSnapshot };
      }

      const result = await this.addDeduction(tx, data, deductions, {
        ingredientId: linkedIngredient.id,
        quantity: item.quantity,
        itemName: linkedIngredient.name,
      });
      if (result.status !== 'OK') {
        return result;
      }
    }

    for (const deduction of deductions.values()) {
      const stockAfter = deduction.stockBefore - deduction.quantity;
      if (stockAfter < 0 && !deduction.allowNegativeStock) {
        return { status: 'INSUFFICIENT_STOCK', itemName: deduction.ingredientName };
      }
    }

    for (const deduction of deductions.values()) {
      const stockAfter = deduction.stockBefore - deduction.quantity;
      await tx.inventoryBalance.update({
        where: { id: deduction.balanceId },
        data: { stockOnHand: stockAfter, updatedById: data.actorUserId },
      });

      await tx.stockMovement.create({
        data: {
          tenantId: data.tenantId,
          branchId: data.branchId,
          inventoryBalanceId: deduction.balanceId,
          ingredientId: deduction.ingredientId,
          type: StockMovementType.SALE_CONSUMPTION,
          quantity: deduction.quantity,
          stockBefore: deduction.stockBefore,
          stockAfter,
          reason: `Venta mesa - ${data.saleId}`,
          createdById: data.actorUserId,
        },
      });
    }

    return { status: 'OK' };
  }

  private async addDeduction(
    tx: Prisma.TransactionClient,
    data: ConsumeSaleInventoryData,
    deductions: Map<string, PendingDeduction>,
    item: { ingredientId: string; quantity: number; itemName: string },
  ): Promise<ConsumeSaleInventoryResult> {
    const balance = await tx.inventoryBalance.findFirst({
      where: {
        tenantId: data.tenantId,
        branchId: data.branchId,
        ingredientId: item.ingredientId,
        deletedAt: null,
        ingredient: { isActive: true, deletedAt: null },
      },
      include: { ingredient: { select: { id: true, name: true } } },
    });

    if (!balance) {
      return { status: 'INVENTORY_NOT_CONFIGURED', itemName: item.itemName };
    }

    const existing = deductions.get(balance.id);
    if (existing) {
      existing.quantity += item.quantity;
      return { status: 'OK' };
    }

    deductions.set(balance.id, {
      balanceId: balance.id,
      ingredientId: balance.ingredientId,
      ingredientName: balance.ingredient.name,
      quantity: item.quantity,
      stockBefore: balance.stockOnHand,
      allowNegativeStock: balance.allowNegativeStock,
    });

    return { status: 'OK' };
  }
}
