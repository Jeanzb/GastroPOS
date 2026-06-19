import type { Prisma } from '../../generated/prisma';
import { ApiErrorCode } from '../errors/api-error-code';
import { ApplicationException } from '../errors/application.exception';
import { dayjs } from './dayjs';

export const DEFAULT_TIMEZONE = 'America/Bogota';
export const BUSINESS_DAY_START_HOUR = 4;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const OFFSET_PATTERN = /([zZ]|[+-]\d{2}:?\d{2})$/;

export interface OperationalDateRange {
  from: Date;
  to: Date;
  operationalDate: string;
  timezone: string;
  businessDayStartsAtHour: number;
}

export function normalizeTimezone(value?: string | null): string {
  if (!value) {
    return DEFAULT_TIMEZONE;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function getOperationalDate(
  value: Date,
  timezone = DEFAULT_TIMEZONE,
  businessDayStartsAtHour = BUSINESS_DAY_START_HOUR,
): string {
  return dayjs(value)
    .tz(normalizeTimezone(timezone))
    .subtract(businessDayStartsAtHour, 'hour')
    .format('YYYY-MM-DD');
}

export function getOperationalDateRange(
  value: Date,
  timezone = DEFAULT_TIMEZONE,
  businessDayStartsAtHour = BUSINESS_DAY_START_HOUR,
): OperationalDateRange {
  const normalizedTimezone = normalizeTimezone(timezone);
  const operationalDate = getOperationalDate(value, normalizedTimezone, businessDayStartsAtHour);
  const localStart = dayjs
    .tz(`${operationalDate}T00:00:00`, normalizedTimezone)
    .add(businessDayStartsAtHour, 'hour');

  return {
    from: localStart.toDate(),
    to: localStart.add(1, 'day').subtract(1, 'millisecond').toDate(),
    operationalDate,
    timezone: normalizedTimezone,
    businessDayStartsAtHour,
  };
}

export function parseDateBoundary(
  value: string,
  field: 'from' | 'to',
  timezone = DEFAULT_TIMEZONE,
): Date {
  const normalizedTimezone = normalizeTimezone(timezone);
  const parsed = DATE_ONLY_PATTERN.test(value)
    ? dayjs.tz(`${value}T${field === 'from' ? '00:00:00.000' : '23:59:59.999'}`, normalizedTimezone)
    : OFFSET_PATTERN.test(value)
      ? dayjs(value)
      : dayjs.tz(value, normalizedTimezone);

  if (!parsed.isValid()) {
    throw new ApplicationException(400, {
      code: ApiErrorCode.BAD_REQUEST,
      message: `Invalid report ${field} date.`,
      details: { [field]: value } as Prisma.InputJsonObject,
    });
  }

  return parsed.toDate();
}

export function getLocalHour(value: Date, timezone = DEFAULT_TIMEZONE): number {
  return dayjs(value).tz(normalizeTimezone(timezone)).hour();
}

export function toIsoString(value: Date): string {
  return dayjs(value).utc().toISOString();
}
