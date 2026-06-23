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

export type PersonType = 'JURIDICA' | 'NATURAL';
export type DocumentType = 'NIT' | 'CC' | 'CE' | 'PAS';

export const PERSON_TYPE_LABEL: Record<PersonType, string> = {
  JURIDICA: 'Persona jurídica',
  NATURAL: 'Persona natural',
};

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  NIT: 'NIT',
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  PAS: 'Pasaporte',
};

/** Document types each person type may use (Colombian rules). */
export const DOCUMENT_TYPES_BY_PERSON: Record<PersonType, DocumentType[]> = {
  JURIDICA: ['NIT'],
  NATURAL: ['CC', 'CE', 'PAS'],
};

/** Only the NIT carries a DIAN verification digit. */
export function requiresVerificationDigit(type: DocumentType): boolean {
  return type === 'NIT';
}

/** Passports are alphanumeric; the rest are numeric. */
export function isNumericDocument(type: DocumentType): boolean {
  return type !== 'PAS';
}

function cleanNumber(type: DocumentType, raw: string): string {
  return type === 'PAS'
    ? raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    : raw.replace(/\D/g, '');
}

/**
 * Stored document string, e.g. "NIT 900123456-7", "CC 1098765432",
 * "CE 1234567", "PAS AB123456".
 */
export function formatDocument(type: DocumentType, rawNumber: string): string | undefined {
  const cleaned = cleanNumber(type, rawNumber);
  if (!cleaned) {
    return undefined;
  }
  if (type === 'NIT') {
    return `NIT ${cleaned}-${computeNitVerificationDigit(cleaned)}`;
  }
  return `${type} ${cleaned}`;
}
