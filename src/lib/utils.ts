/** Small, dependency-free helpers shared across pages and components. */
import type { Category, City, ListingStatus } from './data';
import { SITE } from '../site.config';

type CategoryLike = Category | string;
type CityLike = City | string;

const slugOf = (value: { slug: string } | string): string =>
  typeof value === 'string' ? value : value.slug;

/** Canonical path for a category index, e.g. "/sensory-friendly-haircuts/". */
export function categoryPath(category: CategoryLike): string {
  return `/${slugOf(category)}/`;
}

/** Canonical path for a category-in-city page, with trailing slash. */
export function cityPath(category: CategoryLike, city: CityLike): string {
  return `/${slugOf(category)}/${slugOf(city)}/`;
}

/** Canonical path for a city hub page, e.g. "/cities/san-antonio-tx/". */
export function cityHubPath(city: CityLike): string {
  return `/cities/${slugOf(city)}/`;
}

/** Trust-level badge text + tone for a listing status (null = no badge). */
export function statusLabel(
  status: ListingStatus,
): { text: string; tone: 'documented' | 'verified' } | null {
  if (status === 'documented') return { text: 'Documented · confirm locally', tone: 'documented' };
  if (status === 'verified') return { text: 'Verified', tone: 'verified' };
  return null; // placeholder is surfaced by the page-level sample-data notice
}

/** Join a list into readable prose: "a", "a and b", "a, b, and c". */
export function humanList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** Resolve a site-relative path to an absolute URL using the configured domain. */
export function absoluteUrl(path: string, site: URL | undefined): string {
  const base = site ?? new URL('http://localhost:4321');
  return new URL(path, base).href;
}

/** Append the site name to a page title (or build the homepage title). */
export function formatTitle(title?: string): string {
  return title ? `${title} | ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;
}

/** Format an ISO date (YYYY-MM-DD) as e.g. "June 9, 2026" without timezone drift. */
export function formatDate(iso: string): string {
  const parts = iso.split('-').map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Stable, deterministic string hash (used to vary templated copy per city). */
export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Trim text to a maximum length on a word boundary, adding an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length).trimEnd()}…`;
}
