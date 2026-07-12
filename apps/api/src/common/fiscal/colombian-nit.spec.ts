import { computeNitVerificationDigit, parseColombianNit } from './colombian-nit';

describe('Colombian NIT', () => {
  it.each([
    ['900123456', '8'],
    ['800197268', '4'],
    ['860002964', '4'],
    ['901234567', '7'],
  ])('calculates the verification digit for %s', (nit, expected) => {
    expect(computeNitVerificationDigit(nit)).toBe(expected);
  });

  it('normalizes legacy NIT values and reports an invalid digit', () => {
    expect(parseColombianNit('NIT 900123456-1')).toEqual({
      number: '900123456',
      verificationDigit: '1',
      isValid: false,
    });
  });
});
