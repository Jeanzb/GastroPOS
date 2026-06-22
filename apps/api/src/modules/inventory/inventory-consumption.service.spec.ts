import { StockMovementType } from '../../../generated/prisma';
import { InventoryConsumptionService } from './inventory-consumption.service';

function txMock() {
  return {
    product: {
      findFirst: jest.fn(),
    },
    inventoryIngredient: {
      findFirst: jest.fn(),
    },
    inventoryBalance: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
  };
}

const saleData = {
  tenantId: 'tenant_1',
  branchId: 'branch_1',
  saleId: 'sale_1',
  actorUserId: 'user_1',
};

describe('InventoryConsumptionService', () => {
  it('uses active recipe ingredients before the 1:1 product link', async () => {
    const service = new InventoryConsumptionService();
    const tx = txMock();
    tx.product.findFirst.mockResolvedValueOnce({
      id: 'product_1',
      isInventoried: true,
      recipes: [
        {
          id: 'recipe_1',
          isActive: true,
          deletedAt: null,
          ingredients: [
            {
              ingredientId: 'ingredient_recipe_1',
              quantity: 2,
              ingredient: {
                id: 'ingredient_recipe_1',
                name: 'Carne',
                isActive: true,
                deletedAt: null,
              },
            },
          ],
        },
      ],
    });
    tx.inventoryBalance.findFirst.mockResolvedValueOnce({
      id: 'balance_1',
      ingredientId: 'ingredient_recipe_1',
      stockOnHand: 10,
      allowNegativeStock: false,
      ingredient: { id: 'ingredient_recipe_1', name: 'Carne' },
    });

    const result = await service.consumeSaleItems(tx as never, {
      ...saleData,
      items: [{ productId: 'product_1', nameSnapshot: 'Hamburguesa', quantity: 3 }],
    });

    expect(result).toEqual({ status: 'OK' });
    expect(tx.inventoryIngredient.findFirst).not.toHaveBeenCalled();
    expect(tx.inventoryBalance.update).toHaveBeenCalledWith({
      where: { id: 'balance_1' },
      data: { stockOnHand: 4, updatedById: 'user_1' },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: StockMovementType.SALE_CONSUMPTION,
          quantity: 6,
          stockBefore: 10,
          stockAfter: 4,
        }),
      }),
    );
  });

  it('falls back to the linked inventory ingredient when there is no recipe', async () => {
    const service = new InventoryConsumptionService();
    const tx = txMock();
    tx.product.findFirst.mockResolvedValueOnce({
      id: 'product_1',
      isInventoried: true,
      recipes: [],
    });
    tx.inventoryIngredient.findFirst.mockResolvedValueOnce({
      id: 'ingredient_link_1',
      name: 'Gaseosa lata',
    });
    tx.inventoryBalance.findFirst.mockResolvedValueOnce({
      id: 'balance_1',
      ingredientId: 'ingredient_link_1',
      stockOnHand: 5,
      allowNegativeStock: false,
      ingredient: { id: 'ingredient_link_1', name: 'Gaseosa lata' },
    });

    const result = await service.consumeSaleItems(tx as never, {
      ...saleData,
      items: [{ productId: 'product_1', nameSnapshot: 'Gaseosa', quantity: 2 }],
    });

    expect(result).toEqual({ status: 'OK' });
    expect(tx.inventoryBalance.update).toHaveBeenCalledWith({
      where: { id: 'balance_1' },
      data: { stockOnHand: 3, updatedById: 'user_1' },
    });
  });

  it('blocks inventoried products without recipe or linked ingredient', async () => {
    const service = new InventoryConsumptionService();
    const tx = txMock();
    tx.product.findFirst.mockResolvedValueOnce({
      id: 'product_1',
      isInventoried: true,
      recipes: [],
    });
    tx.inventoryIngredient.findFirst.mockResolvedValueOnce(null);

    const result = await service.consumeSaleItems(tx as never, {
      ...saleData,
      items: [{ productId: 'product_1', nameSnapshot: 'Producto mal configurado', quantity: 1 }],
    });

    expect(result).toEqual({
      status: 'INVENTORY_NOT_CONFIGURED',
      itemName: 'Producto mal configurado',
    });
    expect(tx.inventoryBalance.update).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });
});
