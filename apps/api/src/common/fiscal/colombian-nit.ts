const NIT_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export interface ColombianNit {
  number: string;
  verificationDigit: string;
  isValid: boolean;
}

export function computeNitVerificationDigit(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  const sum = digits
    .split('')
    .reverse()
    .reduce((total, digit, index) => total + Number(digit) * (NIT_WEIGHTS[index] ?? 0), 0);
  const remainder = sum % 11;
  return String(remainder < 2 ? remainder : 11 - remainder);
}

export function parseColombianNit(
  value: string,
  verificationDigit?: string | null,
): ColombianNit | null {
  const normalized = value.trim().replace(/^NIT\s*/i, '');
  const hyphenMatch = normalized.match(/^(.+)-\s*(\d)$/);
  const number = (hyphenMatch?.[1] ?? normalized).replace(/\D/g, '');
  const expectedDigit = computeNitVerificationDigit(number);
  if (!number || expectedDigit === null) {
    return null;
  }

  const explicitDigit = verificationDigit?.replace(/\D/g, '').slice(0, 1);
  const providedDigit = explicitDigit || hyphenMatch?.[2] || expectedDigit;
  return {
    number,
    verificationDigit: providedDigit,
    isValid: providedDigit === expectedDigit,
  };
}
