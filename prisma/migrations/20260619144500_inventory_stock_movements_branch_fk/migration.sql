-- Align stock movement branch ownership with the relational inventory core.
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_branchId_fkey";

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_branchId_fkey"
  FOREIGN KEY ("branchId")
  REFERENCES "branches"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
