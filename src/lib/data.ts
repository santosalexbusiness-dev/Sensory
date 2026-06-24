/**
 * Data access layer.
 *
 * Site content is driven by the JSON files in `src/data`:
 *   - cities.json      the metros we cover (with coordinates + a `seeded` flag)
 *   - categories.json  the category definitions
 *   - listings.json    individual places (placeholders + specific verified venues)
 *   - programs.json    national sensory-friendly programs, expanded into a listing
 *                      for every `seeded` city at load time
 *
 * Adding a city, a listing, a program, or an entirely new category never requires
 * touching page code. The QUALITY GATE below decides which pages get built.
 */
import citiesData from '../data/cities.json';
import listingsData from '../data/listings.json';
import categoriesData from '../data/categories.json';
import programsData from '../data/programs.json';
import { MIN_LISTINGS_PER_CITY } from '../site.config';

export { MIN_LISTINGS_PER_CITY };

export type ListingStatus = 'placeholder' | 'documented' | 'verified';

/** A recurring sensory-friendly time (e.g. 2nd & 4th Saturdays). */
export interface Recurrence {
  /** Weekday name, "Sunday".."Saturday". */
  weekday: string;
  /** Weeks of the month it falls on (1–5). Empty array = every week. */
  weeks: number[];
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
  /** When true, national programs are expanded into listings for this city. */
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
  /** Trust level. Defaults to "placeholder" for sample data, "verified" otherwise. */
  status?: ListingStatus;
  /** Set for national-program listings (e.g. "AMC Theatres"). */
  operator?: string;
  /** Human-readable schedule, used instead of `hours` for program listings. */
  schedule?: string;
  /** Recurring sensory-friendly times, used to build the per-city calendar. */
  recurrence?: Recurrence[];
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

interface ProgramDef {
  id: string;
  name: string;
  operator: string;
  category: string;
  /** If set, expand only into these city slugs (a franchise that isn't national).
   *  If omitted, expand into every `seeded` city in the program's country. */
  availableIn?: string[];
  /** ISO country code this program operates in. Defaults to "US". Scopes the
   *  "expand into every seeded city" path so US chains never leak into, say, London. */
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
const programs = programsData as ProgramDef[];

/** Expand each national program into a "documented" listing per seeded city. */
function expandProgramsToListings(): Listing[] {
  const seeded = cities.filter((c) => c.seeded);
  const out: Listing[] = [];
  for (const p of programs) {
    const targetCities =
      p.availableIn && p.availableIn.length
        ? cities.filter((c) => p.availableIn!.includes(c.slug))
        : // No explicit list → every seeded city in the program's country only.
          seeded.filter((c) => cityCountryCode(c) === (p.country ?? 'US'));
    for (const city of targetCities) {
      out.push({
        id: `${p.id}__${city.slug}`,
        name: p.name,
        category: p.category,
        citySlug: city.slug,
        address: `Participating ${p.operator} locations in ${city.city} — see official schedule`,
        website: p.website,
        phone: '',
        sensoryFeatures: p.sensoryFeatures,
        ageRange: p.ageRange,
        cost: p.cost,
        hours: '',
        schedule: p.schedule,
        recurrence: p.recurrence,
        lastVerified: p.lastVerified,
        sourceUrl: p.sourceUrl,
        parentTip: p.parentTip,
        operator: p.operator,
        status: 'documented',
        lat: city.lat,
        lng: city.lng,
      });
    }
  }
  return out;
}

/** All listings: hand-authored ones plus expanded national programs. */
export const listings: Listing[] = [...rawListings, ...expandProgramsToListings()];

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

/** True for the clearly-marked sample data shipped with the starter. */
export function isPlaceholder(listing: Listing): boolean {
  return /placeholder/i.test(listing.name);
}

/** Resolve a listing's trust level. */
export function effectiveStatus(listing: Listing): ListingStatus {
  if (listing.status) return listing.status;
  return isPlaceholder(listing) ? 'placeholder' : 'verified';
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
 * QUALITY GATE (category × city).
 * Cities with at least MIN_LISTINGS_PER_CITY listings for the given category.
 */
export function getQualifyingCitiesForCategory(
  categorySlug: string,
): CityWithListings[] {
  return cities
    .map((city) => ({ city, listings: getListingsFor(categorySlug, city.slug) }))
    .filter((entry) => entry.listings.length >= MIN_LISTINGS_PER_CITY)
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
 * it earns a dedicated category-in-city page (qualifies) and whether its city
 * hub exists (hubQualifies). Lets a category index link to hubs for cities that
 * have the category but not yet 3 of them.
 */
export function getCitiesWithCategory(categorySlug: string): CityWithCategory[] {
  return cities
    .map((city) => {
      const count = getListingsFor(categorySlug, city.slug).length;
      return {
        city,
        count,
        qualifies: count >= MIN_LISTINGS_PER_CITY,
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
        scheduleText: l.schedule ?? '',
      };
    })
    .filter((i) => i.recurrence.length > 0 || i.dates.length > 0);
}

/** Listings in a city that have recurring times or specific event dates. */
export function getCityCalendarItems(citySlug: string): CalendarItem[] {
  return toCalendarItems(getCityListings(citySlug));
}

/**
 * QUALITY GATE (city hub). A city hub page is built when the city has at least
 * MIN_LISTINGS_PER_CITY listings across all categories combined.
 */
export function cityHubQualifies(citySlug: string): boolean {
  return getCityListings(citySlug).length >= MIN_LISTINGS_PER_CITY;
}

/** All cities whose hub page qualifies, alphabetical. */
export function getQualifyingCities(): City[] {
  return cities
    .filter((c) => cityHubQualifies(c.slug))
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
      return { city, count, qualifies: count >= MIN_LISTINGS_PER_CITY };
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
 * Build-time summary of the quality gate. Prints the (category × city) combos
 * that have any data and whether each is built or skipped, plus a city-hub count.
 * Runs once per build.
 */
let qualityGateLogged = false;
export function logQualityGate(): void {
  if (qualityGateLogged) return;
  qualityGateLogged = true;

  /* eslint-disable no-console */
  console.log(
    `\n[quality-gate] Minimum ${MIN_LISTINGS_PER_CITY} listings required per page.`,
  );
  for (const category of categories) {
    for (const city of cities) {
      const count = getListingsFor(category.slug, city.slug).length;
      if (count === 0) continue;
      const status = count >= MIN_LISTINGS_PER_CITY ? 'BUILD' : 'skip ';
      console.log(`[quality-gate] ${status} ${category.slug}/${city.slug} — ${count}`);
    }
  }
  console.log(
    `[quality-gate] city hubs: ${getQualifyingCities().length} of ${cities.length} cities qualify\n`,
  );
  /* eslint-enable no-console */
}
