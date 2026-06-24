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

/** Most-common sensory features across a set of listings (for intros/meta). */
export function topSensoryFeatures(listings: Listing[], n = 2): string[] {
  const freq = new Map<string, number>();
  for (const listing of listings) {
    for (const feature of listing.sensoryFeatures) {
      freq.set(feature, (freq.get(feature) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([feature]) => feature);
}

/**
 * <title> for a category-in-city page — short, city-led, brand-free to avoid
 * truncation. e.g. "Dallas, TX Sensory-Friendly Movies".
 */
export function cityTitle(category: Category, city: City): string {
  return `${city.city}, ${city.stateAbbr} Sensory-Friendly ${category.shortLabel}`;
}

/** Meta description for a category-in-city page, kept under ~160 characters. */
export function cityMetaDescription(
  category: Category,
  city: City,
  listings: Listing[],
): string {
  const features = topSensoryFeatures(listings, 2).filter(Boolean).join(', ');
  const featurePhrase = features ? ` offering ${features} and more` : '';
  const text =
    `${listings.length} sensory-friendly, autism-friendly ${category.serviceNoun} in ` +
    `${city.city}, ${city.stateAbbr}${featurePhrase}. ` +
    `Hours, cost, ages, upcoming dates, and a parent tip for each.`;
  return truncate(text, 160);
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

/** LocalBusiness (or a more specific subtype) schema for one listing. */
export function localBusinessSchema(
  listing: Listing,
  city: City,
  category: Category,
  site: URL | undefined,
): object {
  // National-program listings (operator set) describe a chain offering across a
  // metro, not one address — so omit streetAddress to keep the schema honest.
  const address: Record<string, unknown> = {
    '@type': 'PostalAddress',
    addressLocality: city.city,
    addressRegion: city.stateAbbr,
    addressCountry: city.countryCode ?? 'US',
  };
  if (!listing.operator) address.streetAddress = listing.address;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': category.schemaType || 'LocalBusiness',
    '@id': `${absoluteUrl(cityPath(category, city), site)}#${listing.id}`,
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
 * won't truncate it. e.g. "Atlanta, GA Sensory-Friendly Activities for Kids".
 */
export function cityHubTitle(city: City): string {
  return `${city.city}, ${city.stateAbbr} Sensory-Friendly Activities for Kids`;
}

/** Meta description for a city hub page. */
export function cityHubMetaDescription(city: City, groups: CategoryGroup[]): string {
  const total = groups.reduce((sum, g) => sum + g.listings.length, 0);
  const cats = humanList(groups.slice(0, 3).map((g) => shortCategoryNoun(g.category)));
  const text =
    `${total} sensory-friendly and autism-friendly things to do with kids in ` +
    `${city.city}, ${city.stateAbbr} — ${cats}${groups.length > 3 ? ', and more' : ''}. ` +
    `See upcoming dates, quiet hours, and the sensory details that matter.`;
  return truncate(text, 160);
}

/**
 * City-hub FAQ — three data-driven Q&As that target the highest-intent searches
 * for a metro ("…near me", "…this weekend", "are they free"). Honest, useful
 * answers; also emitted as FAQPage structured data.
 */
export function buildCityHubFaqs(city: City, groups: CategoryGroup[]): Faq[] {
  const total = groups.reduce((sum, g) => sum + g.listings.length, 0);
  const cats = humanList(groups.map((g) => shortCategoryNoun(g.category)));
  return [
    {
      question: `What sensory-friendly activities are there in ${city.city}?`,
      answer:
        `We've gathered ${total} sensory-friendly and autism-friendly ${total === 1 ? 'option' : 'options'} in ` +
        `${city.city}, ${city.stateAbbr} across ${cats}. Each listing shows the specific ` +
        `accommodations — quieter times, lighting, headphones, and space to take a break — ` +
        `alongside hours, cost, and age range.`,
    },
    {
      question: `How do I find sensory-friendly events near me this weekend in ${city.city}?`,
      answer:
        `Check the "Upcoming sensory-friendly events near ${city.city}" calendar near the top of ` +
        `this page. It lists recurring sensory-friendly times — like monthly sensory-friendly ` +
        `movie screenings and play sessions — with the next concrete dates worked out, including ` +
        `anything coming up this week or this weekend. Always confirm the exact date and time ` +
        `with the venue before you go.`,
    },
    {
      question: `Are sensory-friendly activities in ${city.city} free?`,
      answer:
        `Many are. Sensory-friendly movie screenings and play sessions are usually priced the ` +
        `same as a regular visit, and a lot of museum sensory mornings, library sensory ` +
        `storytimes, and inclusive playgrounds are free or run on standard admission. Each ` +
        `listing's cost line tells you what to expect.`,
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
