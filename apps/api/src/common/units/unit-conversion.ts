// SI-based unit catalog and conversion engine for inventory, recipes and purchases.
// Quantities are stored in each ingredient's base unit; recipes/purchases may use any
// unit of the SAME dimension and are converted through a canonical base:
//   MASS -> gram (g), VOLUME -> milliliter (ml), COUNT -> unit (und).

export type UnitDimension = 'MASS' | 'VOLUME' | 'COUNT';

export interface UnitDefinition {
  /** Stable code stored on records, e.g. "kg", "ml", "und". */
  code: string;
  name: string;
  dimension: UnitDimension;
  /** Multiplier to the canonical base of its dimension (g / ml / und). */
  factor: number;
}

/** Representative units only — no ad-hoc "caja/bulto"; those are handled via pack factors later. */
export const SI_UNITS: readonly UnitDefinition[] = [
  { code: 'g', name: 'Gramo', dimension: 'MASS', factor: 1 },
  { code: 'kg', name: 'Kilogramo', dimension: 'MASS', factor: 1000 },
  { code: 'lb', name: 'Libra', dimension: 'MASS', factor: 453.59237 },
  { code: 'oz', name: 'Onza', dimension: 'MASS', factor: 28.349523 },
  { code: 'ml', name: 'Mililitro', dimension: 'VOLUME', factor: 1 },
  { code: 'L', name: 'Litro', dimension: 'VOLUME', factor: 1000 },
  { code: 'und', name: 'Unidad', dimension: 'COUNT', factor: 1 },
];

const BY_CODE = new Map<string, UnitDefinition>(SI_UNITS.map((unit) => [unit.code, unit]));

export function getUnit(code: string): UnitDefinition | undefined {
  return BY_CODE.get(code);
}

export class UnknownUnitError extends Error {
  constructor(public readonly code: string) {
    super(`Unknown unit of measure: "${code}".`);
    this.name = 'UnknownUnitError';
  }
}

export class IncompatibleUnitsError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Cannot convert ${from} to ${to}: different physical dimensions.`);
    this.name = 'IncompatibleUnitsError';
  }
}

/** True when both units share the same dimension (e.g. kg↔lb, ml↔L). */
export function canConvert(fromCode: string, toCode: string): boolean {
  const from = BY_CODE.get(fromCode);
  const to = BY_CODE.get(toCode);
  return Boolean(from && to && from.dimension === to.dimension);
}

/**
 * Convert an amount between units of the same dimension.
 * e.g. convertQuantity(1.5, 'kg', 'g') === 1500, convertQuantity(200, 'g', 'kg') === 0.2.
 */
export function convertQuantity(amount: number, fromCode: string, toCode: string): number {
  const from = BY_CODE.get(fromCode);
  if (!from) {
    throw new UnknownUnitError(fromCode);
  }
  const to = BY_CODE.get(toCode);
  if (!to) {
    throw new UnknownUnitError(toCode);
  }
  if (from.dimension !== to.dimension) {
    throw new IncompatibleUnitsError(fromCode, toCode);
  }
  if (fromCode === toCode) {
    return amount;
  }
  return (amount * from.factor) / to.factor;
}

/** Units selectable for a given dimension (for unit pickers in the UI). */
export function unitsForDimension(dimension: UnitDimension): UnitDefinition[] {
  return SI_UNITS.filter((unit) => unit.dimension === dimension);
}
