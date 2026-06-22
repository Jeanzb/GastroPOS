// SI unit catalog + conversion for the UI (mirror of apps/api .../common/units).
// MASS->g, VOLUME->ml, COUNT->und are the canonical bases.

export type UnitDimension = 'MASS' | 'VOLUME' | 'COUNT';

export interface UnitOption {
  code: string;
  name: string;
  dimension: UnitDimension;
  factor: number;
}

export const SI_UNITS: UnitOption[] = [
  { code: 'g', name: 'Gramo', dimension: 'MASS', factor: 1 },
  { code: 'kg', name: 'Kilogramo', dimension: 'MASS', factor: 1000 },
  { code: 'lb', name: 'Libra', dimension: 'MASS', factor: 453.59237 },
  { code: 'oz', name: 'Onza', dimension: 'MASS', factor: 28.349523 },
  { code: 'ml', name: 'Mililitro', dimension: 'VOLUME', factor: 1 },
  { code: 'L', name: 'Litro', dimension: 'VOLUME', factor: 1000 },
  { code: 'und', name: 'Unidad', dimension: 'COUNT', factor: 1 },
];

const BY_CODE = new Map(SI_UNITS.map((unit) => [unit.code, unit]));

const ALIASES: Record<string, string> = { un: 'und', lt: 'L', l: 'L' };

/** Resolve legacy/free-text codes to a canonical SI code: "KG"->"kg", "UND"->"und", "l"->"L". */
export function normalizeUnitCode(code: string): string {
  const lower = code.trim().toLowerCase();
  return ALIASES[lower] ?? lower;
}

export function getUnit(code: string): UnitOption | undefined {
  return BY_CODE.get(normalizeUnitCode(code));
}

export function dimensionForCode(code: string): UnitDimension {
  return getUnit(code)?.dimension ?? 'COUNT';
}

export function unitsForDimension(dimension: UnitDimension): UnitOption[] {
  return SI_UNITS.filter((unit) => unit.dimension === dimension);
}

/** Convert between units of the same dimension; returns NaN if incompatible/unknown. */
export function convertQuantity(amount: number, fromCode: string, toCode: string): number {
  const from = getUnit(fromCode);
  const to = getUnit(toCode);
  if (!from || !to || from.dimension !== to.dimension) {
    return Number.NaN;
  }
  return (amount * from.factor) / to.factor;
}
