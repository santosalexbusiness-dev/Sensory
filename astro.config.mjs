// @ts-check
import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ── Thin-content exclusion for the sitemap ───────────────────────────────────
// listings.json holds only hand-researched LOCAL venues; national chain
// programs live in programs.json and are expanded across cities at build time.
// So a city/category page has original content exactly when listings.json has
// an entry for it. Pages built purely from chain programs are near-duplicates
// of every other city's page — they stay live for visitors but are `noindex`
// (see src/lib/data.ts → hasLocalListing) and must not be submitted here.
/** @param {string} p @returns {any[]} */
const readJson = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
/** @type {{ category: string, citySlug: string }[]} */
const localListings = readJson('./src/data/listings.json');
const categorySlugs = new Set(
  readJson('./src/data/categories.json').map((/** @type {{slug: string}} */ c) => c.slug),
);
const citiesWithLocal = new Set(localListings.map((l) => l.citySlug));
const categoryCitiesWithLocal = new Set(
  localListings.map((l) => `${l.category}/${l.citySlug}`),
);

/**
 * False for pages whose content is only national chain programs.
 * @param {string} pathname
 */
function hasOriginalContent(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 2) return true; // not a city/category-city page
  const [first, second] = parts;
  if (first === 'cities') return citiesWithLocal.has(second);
  if (categorySlugs.has(first)) return categoryCitiesWithLocal.has(`${first}/${second}`);
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
