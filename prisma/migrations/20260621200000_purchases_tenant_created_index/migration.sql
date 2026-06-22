-- CreateIndex
CREATE INDEX "purchases_tenantId_createdAt_idx" ON "purchases"("tenantId", "createdAt");
