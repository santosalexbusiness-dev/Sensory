/**
 * Client-safe calendar helpers (no DOM, no server imports), shared by the
 * city-hub calendar and the search-page calendar so both compute dates the same
 * way. Bundled into the browser by Astro's <script> handling.
 */
export interface CalRule {
  weekday: string;
  weeks: number[];
  note?: string;
  /** Months explicitly covered by the source: January = 1, December = 12. */
  months?: number[];
}

export interface CalItem {
  name: string;
  recurrence?: CalRule[];
  dates?: string[];
  /** Original schedule text, including constraints not encoded in a rule. */
  scheduleText?: string;
  /** Internal link to the activity's info (an anchor or page path). */
  href?: string;
}

export interface CalOccurrence {
  date: Date;
  name: string;
  note: string;
  href: string;
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const weekOfMonth = (d: Date): number => Math.floor((d.getDate() - 1) / 7) + 1;

const MONTH_OR_SEASON = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|spring|summer|autumn|fall|winter|season(?:al|ally)?)\b/i;
const UNMODELED_DATE_CONSTRAINT = /\b(?:term[ -]time|school (?:term|year|holidays?)|except|excluding|until|starting|ending|through|20\d{2})\b|\b(?:select(?:ed)?|posted)\s+(?:(?:monthly\s+)?dates?|days?|Mondays?|Tuesdays?|Wednesdays?|Thursdays?|Fridays?|Saturdays?|Sundays?)\b/i;

/**
 * Free-text seasons, exceptions, or selected dates are not sufficient to
 * calculate a booking date. Keep the published schedule visible and withhold
 * projections until its limits are explicitly represented in structured data.
 */
export function canProjectRecurrence(rule: CalRule, scheduleText = ''): boolean {
  const hasMonths = rule.months !== undefined;
  if (hasMonths && (!Array.isArray(rule.months) || rule.months.length === 0 ||
    rule.months.some((month) => !Number.isInteger(month) || month < 1 || month > 12))) return false;
  const text = `${rule.note || ''} ${scheduleText}`;
  if (UNMODELED_DATE_CONSTRAINT.test(text)) return false;
  return hasMonths || !MONTH_OR_SEASON.test(text);
}

/** True if `d` is the last occurrence of its weekday in its month (for weeks: [-1]). */
const isLastWeekdayOfMonth = (d: Date): boolean => {
  const next = new Date(d);
  next.setDate(next.getDate() + 7);
  return next.getMonth() !== d.getMonth();
};

/**
 * Expand recurrence rules and specific event dates into concrete upcoming
 * occurrences within the next `horizonDays`, sorted chronologically.
 */
export function computeUpcoming(items: CalItem[], horizonDays = 75, referenceDate = new Date()): CalOccurrence[] {
  const today = new Date(referenceDate);
  if (!Number.isFinite(today.getTime()) || !Number.isFinite(horizonDays) || horizonDays < 0) return [];
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + horizonDays);

  const occ: CalOccurrence[] = [];

  for (const item of items) {
    for (const rule of item.recurrence || []) {
      if (!canProjectRecurrence(rule, item.scheduleText)) continue;
      const wd = WEEKDAYS.indexOf(rule.weekday);
      if (wd < 0) continue;
      const d = new Date(today);
      while (d <= end) {
        if (
          d.getDay() === wd &&
          (!rule.months || rule.months.includes(d.getMonth() + 1)) &&
          (rule.weeks.length === 0 ||
            rule.weeks.includes(weekOfMonth(d)) ||
            (rule.weeks.includes(-1) && isLastWeekdayOfMonth(d)))
        ) {
          occ.push({
            date: new Date(d),
            name: item.name,
            note: rule.note || '',
            href: item.href || '',
          });
        }
        d.setDate(d.getDate() + 1);
      }
    }
    for (const raw of item.dates || []) {
      const m = raw.match(/(\d{4})-(\d{2})-(\d{2})\s*(?:\(([^)]*)\))?/);
      if (!m) continue;
      const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      // JavaScript normalizes impossible dates (e.g. Feb 30) into another month.
      if (dt.getFullYear() !== Number(m[1]) || dt.getMonth() !== Number(m[2]) - 1 ||
        dt.getDate() !== Number(m[3])) continue;
      dt.setHours(0, 0, 0, 0);
      if (dt >= today && dt <= end) {
        occ.push({ date: dt, name: item.name, note: m[4] || '', href: item.href || '' });
      }
    }
  }

  occ.sort((a, b) => a.date.getTime() - b.date.getTime());
  return occ;
}
