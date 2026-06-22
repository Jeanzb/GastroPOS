// Colombian taxpayer document helpers.

const NIT_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** DIAN check digit (dígito de verificación) for a NIT. Returns null for empty input. */
export function computeNitVerificationDigit(nit: string): string | null {
  const digits = nit.replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  const reversed = digits.split('').reverse();
  let sum = 0;
  for (let i = 0; i < reversed.length; i += 1) {
    sum += Number(reversed[i]) * (NIT_WEIGHTS[i] ?? 0);
  }
  const remainder = sum % 11;
  return String(remainder < 2 ? remainder : 11 - remainder);
}

export type DocumentType = 'NIT' | 'CC';

/** Builds the stored document string, e.g. "NIT 900123456-7" or "CC 1098765432". */
export function formatDocument(type: DocumentType, rawNumber: string): string | undefined {
  const digits = rawNumber.replace(/\D/g, '');
  if (!digits) {
    return undefined;
  }
  if (type === 'NIT') {
    return `NIT ${digits}-${computeNitVerificationDigit(digits)}`;
  }
  return `CC ${digits}`;
}
