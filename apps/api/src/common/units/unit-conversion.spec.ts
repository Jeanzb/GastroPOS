import {
  IncompatibleUnitsError,
  UnknownUnitError,
  canConvert,
  convertQuantity,
  getUnit,
  unitsForDimension,
} from './unit-conversion';

describe('unit-conversion', () => {
  it('converts mass across kg/g/lb', () => {
    expect(convertQuantity(1.5, 'kg', 'g')).toBe(1500);
    expect(convertQuantity(200, 'g', 'kg')).toBeCloseTo(0.2, 10);
    expect(convertQuantity(1, 'lb', 'g')).toBeCloseTo(453.59237, 5);
  });

  it('converts volume across L/ml', () => {
    expect(convertQuantity(2, 'L', 'ml')).toBe(2000);
    expect(convertQuantity(750, 'ml', 'L')).toBeCloseTo(0.75, 10);
  });

  it('treats count as a discrete dimension', () => {
    expect(convertQuantity(15, 'und', 'und')).toBe(15);
    expect(canConvert('und', 'g')).toBe(false);
  });

  it('rejects cross-dimension conversion', () => {
    expect(() => convertQuantity(1, 'g', 'ml')).toThrow(IncompatibleUnitsError);
    expect(() => convertQuantity(1, 'kg', 'L')).toThrow(IncompatibleUnitsError);
  });

  it('throws on unknown units', () => {
    expect(() => convertQuantity(1, 'caja', 'und')).toThrow(UnknownUnitError);
  });

  it('resolves legacy/free-text codes case-insensitively', () => {
    expect(getUnit('KG')?.dimension).toBe('MASS');
    expect(getUnit('UND')?.dimension).toBe('COUNT');
    expect(getUnit('l')?.code).toBe('L');
    expect(convertQuantity(2, 'KG', 'g')).toBe(2000);
  });

  it('lists units per dimension for unit pickers', () => {
    expect(unitsForDimension('MASS').map((unit) => unit.code)).toEqual(['g', 'kg', 'lb', 'oz']);
    expect(unitsForDimension('VOLUME').map((unit) => unit.code)).toEqual(['ml', 'L']);
    expect(unitsForDimension('COUNT').map((unit) => unit.code)).toEqual(['und']);
  });
});
