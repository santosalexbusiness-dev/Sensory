/**
 * Data access layer.
 *
 * Site content is driven by the JSON files in `src/data`:
 *   - cities.json      the metros we cover (with coordinates + a `seeded` flag)
 *   - categories.json  the category definitions
 *   - listings.json    individually sourced local venues
 *   - programs.json    national program references shown on category pages;
 *                      never treated as evidence of a local branch
 *
 * Adding a city, a listing, a program, or an entirely new category never requires
 * touching page code. The QUALITY GATE below decides which pages get built.
 */
import citiesData from '../data/cities.json';
import listingsData from '../data/listings.json';
import categoriesData from '../data/categories.json';
import programsData from '../data/programs.json';
import { MIN_LISTINGS_PER_CITY } from '../site.config';
import { hasIndexableLocalContent, isSourcedLocalListing, legacyDirectoryPaths } from './content-policy.mjs';

export { MIN_LISTINGS_PER_CITY };
export { hasIndexableLocalContent } from './content-policy.mjs';

export type ListingStatus = 'placeholder' | 'documented' | 'verified';

/** A recurring sensory-friendly time (e.g. 2nd & 4th Saturdays). */
export interface Recurrence {
  /** Weekday name, "Sunday".."Saturday". */
  weekday: string;
  /** Weeks of the month it falls on (1–5). Empty array = every week. */
  weeks: number[];
  /** Optional explicit active months, January = 1 through December = 12. */
  months?: number[];
  /** Optional short note, e.g. "morning" or "opens 2 hrs early". */
  note?: string;
}

export interface City {
  slug: string;
  city: string;
  state: string;
  stateAbbr: string;
  lat: number;
  lng: number;
  /** Legacy program-coverage flag; used only to preserve old route history. */
  seeded: boolean;
  /** Full country name. Defaults to "United States" when omitted (legacy US data). */
  country?: string;
  /** ISO country code for schema. Defaults to "US" when omitted. */
  countryCode?: string;
}

/** A city's country name, defaulting to the US for legacy data. */
export const cityCountry = (c: City): string => c.country ?? 'United States';
/** A city's ISO country code, defaulting to the US for legacy data. */
export const cityCountryCode = (c: City): string => c.countryCode ?? 'US';

export interface Listing {
  id: string;
  name: string;
  category: string;
  citySlug: string;
  address: string;
  website: string;
  phone: string;
  sensoryFeatures: string[];
  ageRange: string;
  cost: string;
  hours: string;
  sensoryEventDates?: string[];
  lastVerified: string;
  sourceUrl: string;
  parentTip: string;
  /** Optional precise coordinates; falls back to the city centroid if absent. */
  lat?: number;
  lng?: number;
  /** Trust level. Unspecified source-linked entries default to "documented". */
  status?: ListingStatus;
  /** Optional operator of a sourced local branch (e.g. "AMC Theatres"). */
  operator?: string;
  /** Human-readable schedule, used instead of `hours` for program listings. */
  schedule?: string;
  /** Recurring sensory-friendly times, used to build the per-city calendar. */
  recurrence?: Recurrence[];
  /**
   * Program id associated with a researched local branch. Retained to reconstruct
   * previously published routes during the migration away from program expansion.
   */
  supersedesProgram?: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface Category {
  slug: string;
  name: string;
  /** Short, clean noun for title breakdowns and chips, e.g. "Movies". */
  shortLabel: string;
  nameSingular: string;
  serviceNoun: string;
  placeNoun: string;
  placeNounPlural: string;
  schemaType: string;
  tagline: string;
  description: string;
  guide: string;
  faqs: Faq[];
}

export interface ProgramDef {
  id: string;
  name: string;
  operator: string;
  category: string;
  /** Historical program coverage; never evidence of a participating local venue. */
  availableIn?: string[];
  /** ISO country code where this program operates. Defaults to "US". */
  country?: string;
  website: string;
  sourceUrl: string;
  schedule: string;
  recurrence?: Recurrence[];
  sensoryFeatures: string[];
  ageRange: string;
  cost: string;
  parentTip: string;
  lastVerified: string;
}

export const cities = citiesData as City[];
export const categories = categoriesData as Category[];
const rawListings = listingsData as Listing[];
export const programs = programsData as ProgramDef[];
const legacyPaths = legacyDirectoryPaths(cities, rawListings, programs);

/** Local results require their own source. Program references are separate. */
export const listings: Listing[] = rawListings.filter(isSourcedLocalListing);

export function getProgramsForCategory(categorySlug: string): ProgramDef[] {
  return programs.filter((program) => program.category === categorySlug);
}

/** Look up a single city by slug. */
export function getCity(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug);
}

/** Look up a single category by slug. */
export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

/** All listings for a given category in a given city. */
export function getListingsFor(categorySlug: string, citySlug: string): Listing[] {
  return listings.filter(
    (l) => l.category === categorySlug && l.citySlug === citySlug,
  );
}

/** All listings in a city, across every category. */
export function getCityListings(citySlug: string): Listing[] {
  return listings.filter((l) => l.citySlug === citySlug);
}

/** Whether local data exists; this alone does not make a page indexable. */
export function hasLocalListing(items: Listing[]): boolean {
  return items.some(isSourcedLocalListing);
}

/** True if this city has any hand-researched local venue at all. */
export function cityHasLocalListing(citySlug: string): boolean {
  return hasLocalListing(getCityListings(citySlug));
}

/** True for the clearly-marked sample data shipped with the starter. */
export function isPlaceholder(listing: Listing): boolean {
  return /placeholder/i.test(listing.name);
}

/** Resolve a listing's trust level. */
export function effectiveStatus(listing: Listing): ListingStatus {
  if (listing.status) return listing.status;
  return isPlaceholder(listing) ? 'placeholder' : 'documented';
}

/** A listing's coordinates, falling back to its city's centroid. */
export function listingCoords(listing: Listing): { lat: number; lng: number } | null {
  if (typeof listing.lat === 'number' && typeof listing.lng === 'number') {
    return { lat: listing.lat, lng: listing.lng };
  }
  const city = getCity(listing.citySlug);
  return city ? { lat: city.lat, lng: city.lng } : null;
}

/** Great-circle distance between two points, in miles (Haversine). */
export function distanceMiles(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface CityWithListings {
  city: City;
  listings: Listing[];
}

/**
 * Category pages with sufficient complete local evidence for indexing.
 */
export function getQualifyingCitiesForCategory(
  categorySlug: string,
): CityWithListings[] {
  return cities
    .map((city) => ({ city, listings: getListingsFor(categorySlug, city.slug) }))
    .filter((entry) => hasIndexableLocalContent(entry.listings))
    .sort((a, b) => a.city.city.localeCompare(b.city.city));
}

/** Preserve local content at existing URLs, even while a sparse page is noindex. */
export function getPublishedCitiesForCategory(categorySlug: string): CityWithListings[] {
  return cities
    .map((city) => ({ city, listings: getListingsFor(categorySlug, city.slug) }))
    .filter((entry) => entry.listings.length > 0 && (
      hasIndexableLocalContent(entry.listings) ||
      legacyPaths.has(`/${categorySlug}/${entry.city.slug}/`)
    ))
    .sort((a, b) => a.city.city.localeCompare(b.city.city));
}

export interface CategoryCityPair {
  category: Category;
  city: City;
  listings: Listing[];
}

/** Every (category × city) pair that passes the quality gate. */
export function getQualifyingPairs(): CategoryCityPair[] {
  const pairs: CategoryCityPair[] = [];
  for (const category of categories) {
    for (const { city, listings } of getQualifyingCitiesForCategory(category.slug)) {
      pairs.push({ category, city, listings });
    }
  }
  return pairs;
}

/** Totals for a category across only the cities that pass the gate. */
export function getCategoryStats(categorySlug: string): {
  cityCount: number;
  listingCount: number;
} {
  const qualifying = getQualifyingCitiesForCategory(categorySlug);
  return {
    cityCount: qualifying.length,
    listingCount: qualifying.reduce((sum, c) => sum + c.listings.length, 0),
  };
}

/** Total reach of a category across ALL cities (not gate-filtered). */
export function getCategoryReach(categorySlug: string): {
  listingCount: number;
  cityCount: number;
} {
  const inCategory = listings.filter((l) => l.category === categorySlug);
  return {
    listingCount: inCategory.length,
    cityCount: new Set(inCategory.map((l) => l.citySlug)).size,
  };
}

export interface CityWithCategory {
  city: City;
  count: number;
  qualifies: boolean;
  hubQualifies: boolean;
}

/**
 * Every city that has at least one listing in the category, flagged with whether
 * it has enough complete local content for indexing (qualifies) and whether its
 * city hub exists (hubQualifies). Sparse selections link to their city hub.
 */
export function getCitiesWithCategory(categorySlug: string): CityWithCategory[] {
  return cities
    .map((city) => {
      const count = getListingsFor(categorySlug, city.slug).length;
      return {
        city,
        count,
        qualifies: hasIndexableLocalContent(getListingsFor(categorySlug, city.slug)),
        hubQualifies: cityHubQualifies(city.slug),
      };
    })
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count || a.city.city.localeCompare(b.city.city));
}

export interface CategoryGroup {
  category: Category;
  listings: Listing[];
}

/** Listings in a city grouped by category (for the city hub page). */
export function getCityCategoryGroups(citySlug: string): CategoryGroup[] {
  return categories
    .map((category) => ({ category, listings: getListingsFor(category.slug, citySlug) }))
    .filter((group) => group.listings.length > 0);
}

export interface CalendarItem {
  /** Listing id — used to anchor the calendar entry to its card on the hub. */
  id: string;
  name: string;
  categoryName: string;
  recurrence: Recurrence[];
  /** Raw "YYYY-MM-DD (label)" specific event dates. */
  dates: string[];
  /** Human schedule text, if any (e.g. a program's schedule). */
  scheduleText: string;
}

/** Turn an arbitrary set of listings into calendar items (recurring/dated only). */
export function toCalendarItems(items: Listing[]): CalendarItem[] {
  return items
    .map((l) => {
      const cat = getCategory(l.category);
      return {
        id: l.id,
        name: l.name,
        categoryName: cat ? cat.name : l.category,
        recurrence: l.recurrence ?? [],
        dates: l.sensoryEventDates ?? [],
        scheduleText: l.schedule ?? l.hours ?? '',
      };
    })
    .filter((i) => i.recurrence.length > 0 || i.dates.length > 0);
}

/** Listings in a city that have recurring times or specific event dates. */
export function getCityCalendarItems(citySlug: string): CalendarItem[] {
  return toCalendarItems(getCityListings(citySlug));
}

/**
 * A sourced local venue earns a usable hub; sparse hubs stay noindex.
 */
export function cityHubQualifies(citySlug: string): boolean {
  return getCityListings(citySlug).length > 0;
}

/** All cities whose hub has sufficient local evidence for indexing. */
export function getQualifyingCities(): City[] {
  return cities
    .filter((c) => hasIndexableLocalContent(getCityListings(c.slug)))
    .sort((a, b) => a.city.localeCompare(b.city));
}

/** All available local hubs, including sparse pages retained for visitors. */
export function getPublishedCities(): City[] {
  return cities.filter((city) => cityHubQualifies(city.slug))
    .sort((a, b) => a.city.localeCompare(b.city));
}

/** Nearest other city hubs to `city` (by great-circle distance), for cross-linking. */
export function getNearbyCityHubs(city: City, limit = 6): City[] {
  return getQualifyingCities()
    .filter((c) => c.slug !== city.slug)
    .map((c) => ({ c, d: distanceMiles(city.lat, city.lng, c.lat, c.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.c);
}

/** Nearest other cities that also have a page for `categorySlug`, for cross-linking. */
export function getNearbyCitiesForCategory(
  categorySlug: string,
  city: City,
  limit = 8,
): City[] {
  return getQualifyingCitiesForCategory(categorySlug)
    .map((e) => e.city)
    .filter((c) => c.slug !== city.slug)
    .map((c) => ({ c, d: distanceMiles(city.lat, city.lng, c.lat, c.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.c);
}

export interface CityCount {
  city: City;
  count: number;
  qualifies: boolean;
}

/** Every city with its listing count + whether its hub qualifies (for /cities/). */
export function getAllCitiesWithCounts(): CityCount[] {
  return cities
    .map((city) => {
      const count = getCityListings(city.slug).length;
      return { city, count, qualifies: cityHubQualifies(city.slug) };
    })
    .sort((a, b) => a.city.city.localeCompare(b.city.city));
}

export interface CountryGroup {
  country: string;
  countryCode: string;
  cities: CityCount[];
}

/** Display order for countries; anything else falls in alphabetically after these. */
const COUNTRY_ORDER = [
  'United States',
  'United Kingdom',
  'Ireland',
  'Australia',
  'Canada',
];

/** All cities grouped by country (for the worldwide browse + homepage picker). */
export function getCitiesByCountry(): CountryGroup[] {
  const map = new Map<string, CityCount[]>();
  for (const entry of getAllCitiesWithCounts()) {
    const country = cityCountry(entry.city);
    if (!map.has(country)) map.set(country, []);
    map.get(country)!.push(entry);
  }
  const ordered = [
    ...COUNTRY_ORDER.filter((c) => map.has(c)),
    ...[...map.keys()].filter((c) => !COUNTRY_ORDER.includes(c)).sort(),
  ];
  return ordered.map((country) => ({
    country,
    countryCode: cityCountryCode(map.get(country)![0].city),
    cities: map.get(country)!,
  }));
}

/**
 * Build-time summary of local evidence and which category-city pages can index.
 * Runs once per build.
 */
let qualityGateLogged = false;
export function logQualityGate(): void {
  if (qualityGateLogged) return;
  qualityGateLogged = true;

  /* eslint-disable no-console */
  console.log(
    `\n[quality-gate] Editorial indexing rule: ${MIN_LISTINGS_PER_CITY} complete, sourced local entries; not a Google minimum.`,
  );
  for (const category of categories) {
    for (const city of cities) {
      const count = getListingsFor(category.slug, city.slug).length;
      if (count === 0) continue;
      const status = hasIndexableLocalContent(getListingsFor(category.slug, city.slug)) ? 'INDEX' : 'sparse';
      console.log(`[quality-gate] ${status} ${category.slug}/${city.slug} — ${count}`);
    }
  }
  console.log(
    `[quality-gate] city hubs: ${getQualifyingCities().length} of ${cities.length} cities qualify\n`,
  );
  /* eslint-enable no-console */
}
