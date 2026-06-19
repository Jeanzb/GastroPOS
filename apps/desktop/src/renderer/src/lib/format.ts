import { dayjs } from './dayjs';

export function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor);
}

export function formatDate(iso: string, timezone = 'America/Bogota'): string {
  return dayjs(iso).tz(timezone).format('D MMM YYYY');
}

export function formatDateTime(iso: string | null, timezone = 'America/Bogota'): string {
  if (!iso) {
    return 'Sin cierre';
  }

  return dayjs(iso).tz(timezone).format('D MMM YYYY, h:mm a');
}

export function formatOperationalDate(value: string): string {
  return dayjs(value).format('D MMM YYYY');
}
