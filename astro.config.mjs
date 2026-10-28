// @ts-check
import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { hasIndexableLocalContent, isSourcedLocalListing } from './src/lib/content-policy.mjs';

// Pages and sitemap share one editorial policy. National programs never count
// as local venues, and sparse retained pages remain outside the sitemap.
/** @param {string} p @returns {any[]} */
const readJson = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const localListings = readJson('./src/data/listings.json').filter(isSourcedLocalListing);
const cities = readJson('./src/data/cities.json');
const categorySlugs = new Set(
  readJson('./src/data/categories.json').map((/** @type {{slug: string}} */ c) => c.slug),
);

/**
 * Apply the same local-content rule used by page robots tags.
 * @param {string} pathname
 */
function hasOriginalContent(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (['/search/', '/404.html', '/google832ac6a0b63ad660.html'].includes(pathname)) return false;
  if (parts.length !== 2) return true;
  const [first, second] = parts;
  if (first === 'cities') return hasIndexableLocalContent(localListings.filter((l) => l.citySlug === second));
  if (categorySlugs.has(first)) return hasIndexableLocalContent(
    localListings.filter((l) => l.category === first && l.citySlug === second),
  );
  if (first === 'states') {
    const stateCities = new Set(cities.filter((city) => !city.country &&
      city.state.toLowerCase().replace(/[^a-z]+/g, '-') === second).map((city) => city.slug));
    return hasIndexableLocalContent(localListings.filter((l) => stateCities.has(l.citySlug)));
  }
  return true;
}

// Tailwind CSS v4 is wired up via PostCSS (see postcss.config.mjs).

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: change `site` to your real production domain before you deploy.
// It is the single source of truth for canonical URLs, the generated sitemap,
// and robots.txt. Everything else (Open Graph URLs, JSON-LD, etc.) is derived
// from it via Astro.site, so you only change it here.
// ─────────────────────────────────────────────────────────────────────────────
export default defineConfig({
  site: 'https://sensoryfriendly.guide',
  trailingSlash: 'always',
  // Honor a PORT assigned by the environment (e.g. the preview harness);
  // fall back to Astro's default 4321 for normal local runs.
  // host:true binds all interfaces (IPv4 + IPv6) — without it, Node on Windows
  // resolves "localhost" to IPv6 ::1 only, which breaks IPv4 (127.0.0.1) clients.
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 4321,
  },
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      // Keep utility endpoints and thin chains-only pages out of the sitemap;
      // only substantive pages belong there.
      filter: (page) =>
        !page.endsWith('/robots.txt') && hasOriginalContent(new URL(page).pathname),
    }),
  ],
});
