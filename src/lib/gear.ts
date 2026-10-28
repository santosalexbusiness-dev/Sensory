/**
 * Packing comparisons shared by city pages and the buying guide.
 * Product types are examples, not tested models or therapeutic recommendations.
 */
import productsData from '../data/products.json';
import { SITE } from '../site.config';

export interface Product {
  id: string;
  name: string;
  category: string;
  blurb: string;
  useCase: string;
  alternative: string;
  search: string;
}
export const products = productsData as Product[];

/** Search results are intentionally not presented as vetted individual products. */
export function amazonSearchLink(search: string): string {
  const query = new URLSearchParams({ k: search });
  if (SITE.amazonAssociateTag.trim()) query.set('tag', SITE.amazonAssociateTag.trim());
  return 'https://www.amazon.com/s?' + query.toString();
}
export function productLink(product: Product): string {
  return amazonSearchLink(product.search);
}
export interface GearItem {
  name: string;
  note: string;
  href: string;
}
export interface GearSection {
  heading: string;
  intro: string;
  items: GearItem[];
}
const selections: Record<string, string[]> = {
  'sensory-friendly-movies': ['ear-defenders', 'fidget'],
  'sensory-friendly-haircuts': ['communication-cards', 'comfortable-clothes'],
  'sensory-friendly-museums': ['bag', 'communication-cards'],
  'sensory-friendly-attractions': ['hat', 'bag'],
  'sensory-friendly-play': ['comfortable-clothes', 'communication-cards'],
  'sensory-friendly-theater': ['ear-defenders', 'communication-cards'],
  'inclusive-playgrounds': ['hat', 'comfortable-clothes'],
  'sensory-storytime': ['fidget', 'communication-cards'],
  'city-hub': ['bag', 'communication-cards'],
  fireworks: ['ear-defenders', 'communication-cards'],
  disney: ['hat', 'bag'],
  flying: ['bag', 'communication-cards'],
  halloween: ['comfortable-clothes', 'communication-cards'],
  santa: ['communication-cards', 'fidget'],
};
const byId = new Map(products.map((product) => [product.id, product]));

export function getGearSection(key: string): GearSection | null {
  const ids = selections[key];
  if (!ids) return null;
  const items = ids
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product))
    .map((product) => ({
      name: product.name,
      note: product.alternative,
      href: '/sensory-gear/#' + product.id,
    }));
  return items.length ? {
    heading: 'Prepare a small outing kit',
    intro: 'Start with familiar items you already have. Check the venue’s bag rules and any equipment it can lend before buying more.',
    items,
  } : null;
}
