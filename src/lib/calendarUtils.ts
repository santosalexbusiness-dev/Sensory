/**
 * Client-safe calendar helpers (no DOM, no server imports), shared by the
 * city-hub calendar and the search-page calendar so both compute dates the same
 * way. Bundled into the browser by Astro's <script> handling.
 */
export interface CalRule {
  weekday: string;
  weeks: number[];
  note?: string;
}

export interface CalItem {
  name: string;
  recurrence?: CalRule[];
  dates?: string[];
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
export function computeUpcoming(items: CalItem[], horizonDays = 75): CalOccurrence[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + horizonDays);

  const occ: CalOccurrence[] = [];

  for (const item of items) {
    for (const rule of item.recurrence || []) {
      const wd = WEEKDAYS.indexOf(rule.weekday);
      if (wd < 0) continue;
      const d = new Date(today);
      while (d <= end) {
        if (
          d.getDay() === wd &&
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
      dt.setHours(0, 0, 0, 0);
      if (dt >= today && dt <= end) {
        occ.push({ date: dt, name: item.name, note: m[4] || '', href: item.href || '' });
      }
    }
  }

  occ.sort((a, b) => a.date.getTime() - b.date.getTime());
  return occ;
}
