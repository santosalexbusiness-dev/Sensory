/**
 * Affiliate "gear strip" recommendations shown inside city and category pages.
 *
 * Each section pulls a small, hand-picked set of products (by ASIN) from
 * products.json and pairs them with a context-specific heading — e.g. "What to
 * bring to a sensory-friendly movie" on the movies pages. Adding a section for a
 * new category is a data change here; the page code stays untouched.
 */
import productsData from '../data/products.json';
import { SITE } from '../site.config';

interface Product {
  name: string;
  category: string;
  blurb: string;
  search: string;
  asin?: string;
  useCase?: string;
}

const products = productsData as Product[];
const tag = SITE.amazonAssociateTag.trim();

/** Tagged Amazon search URL (fallback when a product has no specific ASIN). */
export function amazonSearchLink(search: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(search)}${
    tag ? `&tag=${encodeURIComponent(tag)}` : ''
  }`;
}

/** Tagged Amazon link for a product — a /dp/ASIN link when we have an ASIN. */
export function productLink(p: Product): string {
  return p.asin
    ? // `ref=nosim` keeps Amazon from stripping the ?tag= associate ID on the
      // canonical redirect, so the click is attributed and tracked.
      `https://www.amazon.com/dp/${encodeURIComponent(p.asin)}/ref=nosim${
        tag ? `?tag=${encodeURIComponent(tag)}` : ''
      }`
    : amazonSearchLink(p.search);
}

export interface GearItem {
  name: string;
  /** Short "best for" line shown under the name. */
  note: string;
  href: string;
}

export interface GearSection {
  heading: string;
  intro: string;
  items: GearItem[];
}

/** Section definitions, keyed by category slug (plus "city-hub" for the hub). */
const SECTIONS: Record<string, { heading: string; intro: string; asins: string[] }> = {
  'sensory-friendly-movies': {
    heading: 'What to bring to a sensory-friendly movie',
    intro:
      'A relaxed screening is already gentler than a normal one — a couple of small things in your bag make it smoother still.',
    asins: ['B07YRPX74G', 'B07TKKYSVJ', 'B0DHFNGQ4B', 'B088T7Q739'],
  },
  'sensory-friendly-haircuts': {
    heading: 'Helpful gear for haircut appointments',
    intro:
      'A few familiar comforts can turn a dreaded haircut into a manageable one — bring them along and hand them over before the cape goes on.',
    asins: ['B07TKKYSVJ', 'B07YRPX74G', 'B0DHFNGQ4B', 'B07WFDZ72L'],
  },
  'sensory-friendly-museums': {
    heading: 'Pack a calm outing bag',
    intro:
      'A small bag of the right things keeps a big, echoing museum from tipping into too much.',
    asins: ['B0DQ2JZSWK', 'B07YRPX74G', 'B00K4W4AAA', 'B0CX1C6V6Q'],
  },
  'sensory-friendly-attractions': {
    heading: 'Sensory kit for long outings',
    intro:
      'A full day at a zoo, aquarium, or attraction goes better with a packed sensory kit and a little extra peace of mind.',
    asins: ['B0DQ2JZSWK', 'B07YRPX74G', 'B06Y2XR8P5', 'B0CRTDT5NH'],
  },
  'sensory-friendly-play': {
    heading: 'What to pack for a play session',
    intro:
      'Even a sensory-friendly play hour can get loud and bright — these help your child stay regulated and in the fun.',
    asins: ['B07YRPX74G', 'B00K4W4AAA', 'B0DHFNGQ4B', 'B0DQ2JZSWK'],
  },
  'sensory-friendly-theater': {
    heading: 'What to bring to a relaxed performance',
    intro:
      'A relaxed performance welcomes movement and noise; this small kit helps your child settle in and stay.',
    asins: ['B07YRPX74G', 'B07TKKYSVJ', 'B0DHFNGQ4B', 'B088T7Q739'],
  },
  'inclusive-playgrounds': {
    heading: 'Handy gear for a playground trip',
    intro:
      'An outdoor trip is mostly about sun, glare, and wide-open space — pack for those and you are set.',
    asins: ['B00K4W4AAA', 'B0C4153ZYJ', 'B06Y2XR8P5', 'B0DQ2JZSWK'],
  },
  'sensory-storytime': {
    heading: 'A light sensory kit for storytime',
    intro:
      'Storytime is short and gentle, so a light kit is all you need to help your child sit, listen, and join in.',
    asins: ['B0DHFNGQ4B', 'B0C4GR3SJJ', 'B07YRPX74G', 'B088T7Q739'],
  },
  'city-hub': {
    heading: 'Build a sensory kit for days out',
    intro:
      'The small kit that makes any outing easier — packed once and ready to grab on the way out the door.',
    asins: ['B0DQ2JZSWK', 'B07YRPX74G', 'B00K4W4AAA', 'B07TKKYSVJ'],
  },
};

const byAsin = new Map(products.filter((p) => p.asin).map((p) => [p.asin!, p]));

/** Resolve a section key to a ready-to-render gear section, or null if unknown. */
export function getGearSection(key: string): GearSection | null {
  const def = SECTIONS[key];
  if (!def) return null;
  const items: GearItem[] = def.asins
    .map((asin) => byAsin.get(asin))
    .filter((p): p is Product => Boolean(p))
    .map((p) => ({
      name: p.name,
      note: p.useCase ?? p.blurb,
      href: productLink(p),
    }));
  if (items.length === 0) return null;
  return { heading: def.heading, intro: def.intro, items };
}
