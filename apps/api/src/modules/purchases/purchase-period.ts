import { dayjs } from '../../common/date-time/dayjs';
import { normalizeTimezone } from '../../common/date-time/operational-date';

/** Current month as "YYYY-MM" in the tenant timezone. */
export function currentPeriod(timezone?: string | null): string {
  return dayjs().tz(normalizeTimezone(timezone)).format('YYYY-MM');
}

/** UTC instants bounding a "YYYY-MM" month in the tenant timezone: [from, to). */
export function periodRange(period: string, timezone?: string | null): { from: Date; to: Date } {
  const tz = normalizeTimezone(timezone);
  const start = dayjs.tz(`${period}-01 00:00:00`, tz).startOf('month');
  return { from: start.toDate(), to: start.add(1, 'month').toDate() };
}

/** Which month ("YYYY-MM", tenant timezone) a timestamp belongs to. */
export function periodOf(value: Date, timezone?: string | null): string {
  return dayjs(value).tz(normalizeTimezone(timezone)).format('YYYY-MM');
}
