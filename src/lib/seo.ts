/**
 * SEO content + structured-data (JSON-LD) builders.
 *
 * Everything here is category-agnostic: it reads its nouns and copy from the
 * category data, so a brand-new category renders correct prose and schema with
 * no code changes.
 */
import type { Category, CategoryGroup, City, Faq, Listing } from './data';
import { SITE } from '../site.config';
import { absoluteUrl, cityPath, hashString, humanList, truncate } from './utils';

/**
 * Features that don't survive being dropped into a sentence.
 *
 * Both callers splice these into running prose ("… offering X and more."), so a
 * feature that is really a caveat, an instruction, or a superlative claim about
 * one venue reads badly or becomes untrue of the others: "offering participating
 * locations only — confirm with your local park and more." Cards still show
 * every feature verbatim; this only governs generated prose.
 */
const readsAsProse = (feature: string): boolean =>
  !/ — |confirm|^participating\b|^verified\b|\bfirst\b/i.test(feature);

/** Most-common sensory features across a set of listings (for intros/meta). */
export function topSensoryFeatures(listings: Listing[], n = 2): string[] {
  const freq = new Map<string, number>();
  for (const listing of listings) {
    for (const feature of listing.sensoryFeatures) {
      if (!readsAsProse(feature)) continue;
      freq.set(feature, (freq.get(feature) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([feature]) => feature);
}

/**
 * Build-time year appended to directory titles — dated titles lift CTR in
 * search results, and because it's computed at build time it stays current on
 * every deploy (the site rebuilds far more often than yearly).
 */
const TITLE_YEAR = new Date().getFullYear();

/**
 * <title> for a category-in-city page — short, city-led, brand-free to avoid
 * truncation. e.g. "Dallas, TX Sensory-Friendly Movies (2026)".
 */
export function cityTitle(category: Category, city: City): string {
  return `${city.city}, ${city.stateAbbr} Sensory-Friendly ${category.shortLabel} (${TITLE_YEAR})`;
}

/**
 * Meta description for a category-in-city page, kept under ~160 characters.
 *
 * Like the city-hub version, this is built to fit rather than cut to fit.
 * Preference order: features + the closing "Hours, cost, ages…" line, then the
 * longest feature phrase that fits on its own, then the opening alone. Features
 * are what differ between two cities' pages, so they outrank the boilerplate.
 */
export function cityMetaDescription(
  category: Category,
  city: City,
  listings: Listing[],
): string {
  const features = topSensoryFeatures(listings, 2).filter(Boolean);
  const head =
    `${listings.length} sensory-friendly, autism-friendly ${category.serviceNoun} in ` +
    `${city.city}, ${city.stateAbbr}`;
  const tail = ' Hours, cost, ages, upcoming dates, and a parent tip for each.';

  const withFeatures = (n: number) =>
    `${head} offering ${features.slice(0, n).join(', ')} and more.`;

  // Prefer the complete sentence: as many features as will fit *alongside* the
  // closing line. Failing that, spend the whole budget on features, since those
  // are what differs from one city's page to the next.
  for (let n = features.length; n >= 1; n--) {
    const candidate = withFeatures(n);
    if (candidate.length + tail.length <= 160) return candidate + tail;
  }
  if (`${head}.`.length + tail.length <= 160 && features.length === 0)
    return `${head}.${tail}`;
  for (let n = features.length; n >= 1; n--) {
    const candidate = withFeatures(n);
    if (candidate.length <= 160) return candidate;
  }
  return truncate(`${head}.`, 160);
}

/**
 * A natural-sounding, 2–3 sentence intro for a category-in-city page.
 * Three variants are selected deterministically per city so pages don't all
 * read identically, and every variant pulls real numbers/features from the data.
 */
export function buildCityIntro(
  category: Category,
  city: City,
  listings: Listing[],
): string {
  const count = listings.length;
  const top = topSensoryFeatures(listings, 2);
  const features =
    top.length >= 2
      ? `${top[0]} and ${top[1]}`
      : top[0] ?? 'thoughtful sensory accommodations';
  const singular = category.nameSingular.toLowerCase();

  const variants = [
    `Finding a ${singular} in ${city.city}, ${city.stateAbbr} shouldn't be ` +
      `stressful. We've gathered ${count} ${category.placeNounPlural} that ` +
      `accommodate sensory needs — with features like ${features} — so you can ` +
      `pick the right fit for your child. Each listing notes hours, cost, age ` +
      `range, and a practical tip from other parents.`,

    `If busy ${category.placeNounPlural} overwhelm your child, ${city.city} has ` +
      `gentler options. Below are ${count} places offering sensory-friendly ` +
      `${category.serviceNoun}, many with ${features} and staff who take their ` +
      `time. We list exactly what each one provides so the visit holds no surprises.`,

    `For families in ${city.city}, ${city.state}, a ${singular} can turn a ` +
      `dreaded errand into a manageable one. These ${count} ` +
      `${category.placeNounPlural} offer accommodations such as ${features}, and ` +
      `we've included the details that matter — age ranges, pricing, hours, and ` +
      `parent tips — for each.`,
  ];

  return variants[hashString(city.slug) % variants.length];
}

/* ──────────────────────────────  JSON-LD  ────────────────────────────────── */

export interface Crumb {
  name: string;
  url: string;
}

/** BreadcrumbList schema. `items` URLs should already be absolute. */
export function breadcrumbSchema(items: Crumb[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * True when an address string is specific enough to publish as a
 * `streetAddress`. Rows that only name a locality and defer to the venue's own
 * site ("Dallas, TX — see location page for address", "Select Broadway
 * theaters …") are not, and are better described by locality alone.
 */
function isStreetAddress(address: string): boolean {
  if (!address.trim()) return false;
  return !/see (location page|website|schedule|official)|^select |^participating |^various |^multiple /i.test(
    address,
  );
}

/** LocalBusiness (or a more specific subtype) schema for one listing. */
export function localBusinessSchema(
  listing: Listing,
  city: City,
  category: Category,
  site: URL | undefined,
  /**
   * Path of the page this schema is being emitted on, used to build the node's
   * `@id`. Defaults to the category-in-city page — but a city hub also lists
   * categories that never earned their own page, and defaulting there produced
   * `@id`s pointing at URLs that do not exist. Pass the current page's path.
   */
  pagePath: string = cityPath(category, city),
): object {
  // National-program listings (operator set) describe a chain offering across a
  // metro, not one address — so omit streetAddress to keep the schema honest.
  // A handful of hand-authored rows are the same shape: they name a locality
  // and point at the venue's own site rather than giving a street address
  // ("Dallas, TX — see location page for address"). Emitting those as
  // streetAddress claims a precision the data does not have.
  const address: Record<string, unknown> = {
    '@type': 'PostalAddress',
    addressLocality: city.city,
    addressRegion: city.stateAbbr,
    addressCountry: city.countryCode ?? 'US',
  };
  if (!listing.operator && isStreetAddress(listing.address)) {
    address.streetAddress = listing.address;
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': category.schemaType || 'LocalBusiness',
    '@id': `${absoluteUrl(pagePath, site)}#${listing.id}`,
    name: listing.name,
    address,
    areaServed: `${city.city}, ${city.stateAbbr}`,
    amenityFeature: listing.sensoryFeatures.map((feature) => ({
      '@type': 'LocationFeatureSpecification',
      name: feature,
      value: true,
    })),
  };
  if (listing.website) schema.url = listing.website;
  if (listing.phone) schema.telephone = listing.phone;
  return schema;
}

/** ItemList schema for a directory of items (businesses or cities). */
export function itemListSchema(
  name: string,
  items: { name: string; url: string }[],
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

/** FAQPage schema from a category's FAQs. */
export function faqSchema(faqs: Faq[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/** Organization/WebSite schema for the homepage. */
export function websiteSchema(site: URL | undefined): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    description: SITE.description,
    url: absoluteUrl('/', site),
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
    },
  };
}

/* ──────────────────────────  City hub helpers  ───────────────────────────── */

function shortCategoryNoun(category: Category): string {
  return category.name.replace(/^Sensory-Friendly\s+/i, '').toLowerCase();
}

/**
 * <title> for a city hub page — short, city-led, and brand-free so Google
 * won't truncate it. e.g. "Atlanta, GA Sensory-Friendly Activities for Kids (2026)".
 * The year sits last so if Google truncates a long city name, only the year is lost.
 */
export function cityHubTitle(city: City): string {
  return `${city.city}, ${city.stateAbbr} Sensory-Friendly Activities for Kids (${TITLE_YEAR})`;
}

/**
 * Meta description for a city hub page.
 *
 * Built to fit the ~160-character budget rather than composed long and cut
 * short: truncating a fixed sentence left most city hubs ending mid-list
 * ("…, and zoos, aquariums & attractions,…").
 *
 * Preference order, best first:
 *   1. category list + the closing line,
 *   2. the longest category list that fits on its own,
 *   3. the opening alone, truncated.
 *
 * In practice the opening runs ~78 characters and the closing line 70, so most
 * hubs land on (2) — which is the better outcome anyway: the real category
 * list is what distinguishes one city's page from the next, while the closing
 * line is the same boilerplate on all 543 of them.
 */
export function cityHubMetaDescription(city: City, groups: CategoryGroup[]): string {
  const total = groups.reduce((sum, g) => sum + g.listings.length, 0);
  const nouns = groups.map((g) => shortCategoryNoun(g.category));
  const head =
    `${total} sensory-friendly and autism-friendly things to do with kids in ` +
    `${city.city}, ${city.stateAbbr}`;
  const tail = ' See upcoming dates, quiet hours, and the sensory details that matter.';

  const withNouns = (n: number) => {
    const list =
      n < nouns.length ? `${nouns.slice(0, n).join(', ')}, and more` : humanList(nouns);
    return `${head} — ${list}.`;
  };

  // Prefer the complete sentence: as many categories as will fit *alongside*
  // the closing line. Failing that, spend the whole budget on categories, since
  // those are what differs from one city's page to the next.
  for (let n = nouns.length; n >= 1; n--) {
    const candidate = withNouns(n);
    if (candidate.length + tail.length <= 160) return candidate + tail;
  }
  for (let n = nouns.length; n >= 1; n--) {
    const candidate = withNouns(n);
    if (candidate.length <= 160) return candidate;
  }
  return truncate(`${head}.`, 160);
}

/**
 * City-hub FAQ — three data-driven Q&As that target the highest-intent searches
 * for a metro ("…near me", "…this weekend", "are they free"). Honest, useful
 * answers; also emitted as FAQPage structured data.
 */
/** Cost wording that unambiguously means the visit itself is free. Deliberately
 *  strict: "General admission; sensory tools free" is not a free visit. */
const FREE_COST = /^free\b|\bfree admission\b|\bfree entry\b|\badmission is free\b|\bno charge\b/i;

/**
 * City-hub FAQ, built from that city's actual listings.
 *
 * These were previously three fixed paragraphs with the city name dropped in,
 * which made them identical across every hub and — on cities with no recurring
 * sessions — pointed readers at a calendar that is not rendered there. Each
 * answer now names real venues from the page, so it differs city to city and
 * only claims what the data supports.
 */
export function buildCityHubFaqs(city: City, groups: CategoryGroup[]): Faq[] {
  const all = groups.flatMap((g) => g.listings);
  const total = all.length;
  const cats = humanList(groups.map((g) => shortCategoryNoun(g.category)));
  const where = `${city.city}, ${city.stateAbbr}`;

  const shortName = (l: Listing) => l.name.split(/\s+[—–]\s+/)[0].trim();
  const names = all.map(shortName);
  const extra = total - Math.min(3, total);
  // humanList already supplies the final "and", so only use it when the list is
  // complete — otherwise "a, b, and c, and 2 more" doubles the conjunction.
  const named = extra > 0 ? names.slice(0, 3).join(', ') : humanList(names.slice(0, 3));

  const features = topSensoryFeatures(all, 3);
  const featurePhrase = features.length
    ? ` Between them the listed accommodations include ${humanList(features)}.`
    : '';

  const recurring = all.filter((l) => (l.recurrence ?? []).length > 0);
  const freeOnes = all.filter((l) => FREE_COST.test(l.cost || ''));

  return [
    {
      question: `What sensory-friendly activities are there in ${city.city}?`,
      answer:
        `We list ${total} source-linked ${total === 1 ? 'place' : 'places'} in ${where}, across ` +
        `${cats}: ${named}${extra > 0 ? `, and ${extra} more` : ''}.${featurePhrase} ` +
        `Every listing links the official page the details came from.`,
    },
    {
      question: `How do I find sensory-friendly events near me this weekend in ${city.city}?`,
      answer: recurring.length
        ? `${recurring.length} of the ${city.city} listings ${recurring.length === 1 ? 'runs' : 'run'} on a repeating schedule — ` +
          `${humanList(recurring.slice(0, 3).map(shortName))} — ` +
          `and the calendar on this page works out the next dates from it. Treat those as estimates ` +
          `and confirm the exact time with the venue, since schedules change without notice.`
        : `None of the ${city.city} venues we list publish a fixed recurring session, so there is no ` +
          `reliable "this weekend" answer we can give you here. Open each listing's official source ` +
          `for its current dates, and ask the venue directly which hours are quietest — that is often ` +
          `more useful than waiting for a scheduled event.`,
    },
    {
      question: `Are sensory-friendly activities in ${city.city} free?`,
      answer: freeOnes.length
        ? `${freeOnes.length} of the ${total} we list ${freeOnes.length === 1 ? 'is' : 'are'} free` +
          `${freeOnes.length === 1 ? ': ' : ', including '}` +
          `${humanList(freeOnes.slice(0, 2).map(shortName))}. ` +
          `The rest run on the venue's standard admission, sometimes with the sensory session itself ` +
          `included at no extra cost. Each listing's cost line shows what we found.`
        : `The ${city.city} venues we list run on their standard admission rather than charging extra ` +
          `for the sensory session, and some include sensory kits or quiet rooms at no cost. We have ` +
          `not found a free option here yet — each listing's cost line shows exactly what we found.`,
    },
  ];
}

/** Natural-sounding intro for a city hub page. */
export function buildCityHubIntro(city: City, groups: CategoryGroup[]): string {
  const total = groups.reduce((sum, g) => sum + g.listings.length, 0);
  const cats = humanList(groups.map((g) => shortCategoryNoun(g.category)));
  return (
    `Looking for sensory-friendly things to do with your kids in ${city.city}? ` +
    `We've gathered ${total} ${total === 1 ? 'option' : 'options'} across ${cats}. ` +
    `Each one lists the accommodations that matter — quieter times, lighting, ` +
    `headphones, and space to take a break — so you can plan an outing that works.`
  );
}
