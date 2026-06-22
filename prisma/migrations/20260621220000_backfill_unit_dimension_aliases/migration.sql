-- Backfill dimension/factor for legacy free-text unit codes (case-insensitive aliases).
UPDATE "unit_of_measures" SET "dimension" = 'MASS', "factor" = 1
  WHERE LOWER("code") IN ('g', 'gr', 'grs', 'gramo', 'gramos');
UPDATE "unit_of_measures" SET "dimension" = 'MASS', "factor" = 1000
  WHERE LOWER("code") IN ('kg', 'kgs', 'kilo', 'kilos', 'kilogramo');
UPDATE "unit_of_measures" SET "dimension" = 'MASS', "factor" = 453.59237
  WHERE LOWER("code") IN ('lb', 'libra', 'libras');
UPDATE "unit_of_measures" SET "dimension" = 'MASS', "factor" = 28.349523
  WHERE LOWER("code") IN ('oz', 'onza', 'onzas');
UPDATE "unit_of_measures" SET "dimension" = 'VOLUME', "factor" = 1
  WHERE LOWER("code") IN ('ml', 'mililitro', 'mililitros');
UPDATE "unit_of_measures" SET "dimension" = 'VOLUME', "factor" = 1000
  WHERE LOWER("code") IN ('l', 'lt', 'litro', 'litros');
UPDATE "unit_of_measures" SET "dimension" = 'COUNT', "factor" = 1
  WHERE LOWER("code") IN ('und', 'un', 'unidad', 'unidades');
