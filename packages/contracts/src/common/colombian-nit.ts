const NIT_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export interface ColombianNitParts {
  number: string;
  verificationDigit: string;
  expectedVerificationDigit: string;
  formatted: string;
  isValid: boolean;
}

export function computeNitVerificationDigit(nit: string): string | null {
  const digits = nit.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  const reversed = digits.split('').reverse();
  let sum = 0;
  for (let index = 0; index < reversed.length; index += 1) {
    sum += Number(reversed[index]) * (NIT_WEIGHTS[index] ?? 0);
  }

  const remainder = sum % 11;
  return String(remainder < 2 ? remainder : 11 - remainder);
}

export function parseColombianNit(
  nit: string,
  verificationDigit?: string | null,
): ColombianNitParts | null {
  const normalizedInput = nit.trim().replace(/^NIT\s*/i, '');
  const hyphenMatch = normalizedInput.match(/^(.+)-\s*(\d)$/);
  const numberPart = hyphenMatch?.[1] ?? normalizedInput;
  const number = numberPart.replace(/\D/g, '');
  if (!number) {
    return null;
  }

  const explicitDigit = verificationDigit?.replace(/\D/g, '').slice(0, 1);
  const providedDigit = explicitDigit || hyphenMatch?.[2];
  const expectedVerificationDigit = computeNitVerificationDigit(number);
  if (!expectedVerificationDigit) {
    return null;
  }

  const finalDigit = providedDigit ?? expectedVerificationDigit;
  return {
    number,
    verificationDigit: finalDigit,
    expectedVerificationDigit,
    formatted: `${number}-${finalDigit}`,
    isValid: finalDigit === expectedVerificationDigit,
  };
}

export function normalizeColombianNit(
  nit: string,
  verificationDigit?: string | null,
): string | null {
  return parseColombianNit(nit, verificationDigit)?.formatted ?? null;
}
