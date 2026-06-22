-- CreateTable
CREATE TABLE "product_recipes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "product_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recipe_ingredients" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "product_recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_recipes_tenantId_idx" ON "product_recipes"("tenantId");

-- CreateIndex
CREATE INDEX "product_recipes_tenantId_isActive_idx" ON "product_recipes"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "product_recipes_tenantId_productId_key" ON "product_recipes"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "product_recipe_ingredients_tenantId_idx" ON "product_recipe_ingredients"("tenantId");

-- CreateIndex
CREATE INDEX "product_recipe_ingredients_ingredientId_idx" ON "product_recipe_ingredients"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "product_recipe_ingredients_tenantId_recipeId_ingredientId_key" ON "product_recipe_ingredients"("tenantId", "recipeId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_ingredients_tenantId_productId_key" ON "inventory_ingredients"("tenantId", "productId");

-- AddForeignKey
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipe_ingredients" ADD CONSTRAINT "product_recipe_ingredients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipe_ingredients" ADD CONSTRAINT "product_recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "product_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipe_ingredients" ADD CONSTRAINT "product_recipe_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "inventory_ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
