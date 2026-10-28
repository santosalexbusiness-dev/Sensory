/**
 * Pre-deploy audit.
 *
 *   npm run build && npm run audit
 *
 * Checks the JSON data and the built `dist/` for the classes of problem that
 * have actually bitten this site: fabricated or dangling data, thin pages
 * leaking into the sitemap, broken internal links, malformed structured data,
 * truncated meta descriptions, untagged affiliate links, and accessibility
 * regressions. Exits non-zero if anything in the FAIL list trips, so it can
 * gate a deploy.
 *
 * Findings are split into FAIL (must fix) and WARN (worth a look). A handful of
 * files are legitimately exempt — see EXEMPT_PAGES below.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasIndexableLocalContent, isSourcedLocalListing, isCompleteLocalListing, legacyDirectoryPaths } from '../src/lib/content-policy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(ROOT, 'src', 'data');
const ORIGIN = 'https://sensoryfriendly.guide';

/** Meta-description budget Google will usually render without cutting. */
const MAX_DESC = 160;
/** Distance beyond which a listing's coordinates probably belong to another city. */
const MAX_LISTING_MILES = 60;

/**
 * Pages that legitimately lack the usual <head> furniture.
 * - The Google Search Console token file is a bare text response by design.
 * - The 404 is served under every unmatched URL, so it has no canonical of its
 *   own (see BaseHead's `noCanonical`).
 */
const EXEMPT_PAGES = {
  '/google832ac6a0b63ad660.html': ['title', 'description', 'canonical', 'robots', 'h1', 'lang', 'sitemap'],
  '/404.html': ['canonical'],
};

const fail = [];
const warn = [];
const F = (m) => fail.push(m);
const W = (m) => warn.push(m);
const exempt = (page, what) => (EXEMPT_PAGES[page] || []).includes(what);

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

/* ─────────────────────────────  1. data  ────────────────────────────────── */

const cities = readJson('cities.json');
const categories = readJson('categories.json');
const listings = readJson('listings.json');
const programs = readJson('programs.json');
const sourcedListings = listings.filter(isSourcedLocalListing);
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const redirects = vercel.redirects || [];

const citySlugs = new Set(cities.map((c) => c.slug));
const catSlugs = new Set(categories.map((c) => c.slug));

const dupes = (arr, key) => {
  const seen = new Map();
  for (const x of arr) seen.set(x[key], (seen.get(x[key]) ?? 0) + 1);
  return [...seen].filter(([, n]) => n > 1);
};
for (const [s, n] of dupes(cities, 'slug')) F(`data: duplicate city slug "${s}" (x${n})`);
for (const [s, n] of dupes(categories, 'slug')) F(`data: duplicate category slug "${s}" (x${n})`);
for (const [s, n] of dupes(listings, 'id')) F(`data: duplicate listing id "${s}" (x${n})`);
for (const [s, n] of dupes(programs, 'id')) F(`data: duplicate program id "${s}" (x${n})`);

const REQUIRED = [
  'id', 'name', 'category', 'citySlug', 'address', 'website',
  'sensoryFeatures', 'ageRange', 'cost', 'lastVerified', 'sourceUrl', 'parentTip',
];
const today = new Date().toISOString().slice(0, 10);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const miles = (aLat, aLng, bLat, bLng) => {
  const R = 3958.8;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

for (const c of cities) {
  if (typeof c.lat !== 'number' || typeof c.lng !== 'number') F(`data: city ${c.slug} missing lat/lng`);
  else if (Math.abs(c.lat) > 90 || Math.abs(c.lng) > 180) F(`data: city ${c.slug} coords out of range`);
  if (c.lat === 0 && c.lng === 0) F(`data: city ${c.slug} sits on null island`);
  for (const k of ['city', 'state', 'stateAbbr']) if (!c[k]) F(`data: city ${c.slug} missing ${k}`);
}

for (const l of listings) {
  if (!citySlugs.has(l.citySlug)) F(`data: listing ${l.id} → unknown city "${l.citySlug}"`);
  if (!catSlugs.has(l.category)) F(`data: listing ${l.id} → unknown category "${l.category}"`);
  // A sourced branch may have an operator; a generic chain record cannot pass
  // as a local venue merely because it was placed in listings.json.
  if (!isSourcedLocalListing(l)) F(`data: listing ${l.id} lacks sourced local evidence`);
  if (l.status && !['placeholder', 'documented', 'verified'].includes(l.status))
    F(`data: listing ${l.id} has an unknown status "${l.status}"`);
  if (/placeholder/i.test(l.name)) F(`data: listing ${l.id} still has a placeholder name`);
  for (const k of REQUIRED) {
    const v = l[k];
    if (v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length))
      F(`data: listing ${l.id} missing required field "${k}"`);
  }
  if (l.lat !== undefined || l.lng !== undefined) {
    const city = cities.find((c) => c.slug === l.citySlug);
    if (typeof l.lat !== 'number' || typeof l.lng !== 'number') F(`data: listing ${l.id} partial lat/lng`);
    else if (city) {
      const d = miles(l.lat, l.lng, city.lat, city.lng);
      if (d > MAX_LISTING_MILES)
        F(`data: listing ${l.id} is ${d.toFixed(0)}mi from ${l.citySlug} — wrong city or wrong coords`);
    }
  }
}

const programIds = new Set(programs.map((p) => p.id));
for (const l of listings) {
  if (l.supersedesProgram && !programIds.has(l.supersedesProgram))
    F(`data: listing ${l.id} supersedesProgram "${l.supersedesProgram}" — no such program`);
}

for (const p of programs) {
  if (!catSlugs.has(p.category)) F(`data: program ${p.id} → unknown category "${p.category}"`);
  if (!p.operator) F(`data: program ${p.id} missing "operator"`);
  for (const s of p.availableIn ?? [])
    if (!citySlugs.has(s)) F(`data: program ${p.id} availableIn unknown city "${s}"`);
}

// Editorial behavior checks: a single row, duplicates, a generic program, or
// incomplete source details must never unlock local indexing.
const example = sourcedListings.find(isCompleteLocalListing);
if (!example) F('policy: no complete sourced local listing exists');
else {
  if (hasIndexableLocalContent([example])) F('policy: one listing incorrectly allows indexing');
  if (hasIndexableLocalContent([example, example, example])) F('policy: duplicated listing allows indexing');
  const distinct = [0, 1, 2].map((i) => ({ ...example, id: `policy-fixture-${i}` }));
  if (!hasIndexableLocalContent(distinct)) F('policy: complete distinct local entries should qualify');
  if (hasIndexableLocalContent(distinct.map((l) => ({ ...l, sourceUrl: '' }))))
    F('policy: missing sources incorrectly allow indexing');
  if (hasIndexableLocalContent(distinct.map((l) => ({ ...l, address: 'Participating locations — see official schedule' }))))
    F('policy: generic national programs incorrectly allow local indexing');
  if (!isCompleteLocalListing({ ...example, operator: 'A researched local branch' }))
    F('policy: a sourced local branch is incorrectly excluded because of its operator');
}

const legacyPaths = legacyDirectoryPaths(cities, listings, programs);
const expectedRedirectSources = new Set([...legacyPaths].filter((url) => {
  const [section, citySlug] = url.split('/').filter(Boolean);
  return !sourcedListings.some((l) => l.citySlug === citySlug &&
    (section === 'cities' || l.category === section));
}));
const configuredRedirects = new Map(redirects.map((redirect) => [redirect.source, redirect]));
if (configuredRedirects.size !== redirects.length) F('redirects: duplicate redirect sources');
for (const source of expectedRedirectSources) {
  const redirect = configuredRedirects.get(source);
  const expectedDestination = source.startsWith('/cities/') ? '/cities/' : `/${source.split('/')[1]}/#programs`;
  if (!redirect || redirect.destination !== expectedDestination || redirect.permanent !== true)
    F(`redirects: missing permanent legacy redirect ${source} → ${expectedDestination}`);
}
for (const redirect of redirects) {
  if (legacyPaths.has(redirect.source) && !expectedRedirectSources.has(redirect.source))
    F(`redirects: sourced local content must remain available at ${redirect.source}`);
}

for (const item of [...listings, ...programs]) {
  if (item.lastVerified && !ISO_DATE.test(item.lastVerified))
    F(`data: ${item.id} lastVerified is not YYYY-MM-DD ("${item.lastVerified}")`);
  else if (item.lastVerified > today) F(`data: ${item.id} lastVerified is in the future`);
  for (const d of item.sensoryEventDates ?? []) {
    const iso = String(d).slice(0, 10);
    if (!ISO_DATE.test(iso)) F(`data: ${item.id} malformed sensoryEventDate "${d}"`);
    else if (iso < today) W(`data: ${item.id} has a past sensoryEventDate (${d})`);
  }
  for (const r of item.recurrence ?? []) {
    if (!WEEKDAYS.includes(r.weekday)) F(`data: ${item.id} bad recurrence weekday "${r.weekday}"`);
    // -1 is the "last <weekday> of the month" convention (see calendarUtils).
    for (const w of r.weeks ?? [])
      if (!Number.isInteger(w) || (w !== -1 && (w < 1 || w > 5)))
        F(`data: ${item.id} recurrence week out of range: ${w}`);
    if (r.months !== undefined && (!Array.isArray(r.months) || r.months.length === 0 ||
      r.months.some((month) => !Number.isInteger(month) || month < 1 || month > 12)))
      F(`data: ${item.id} recurrence months must contain integers 1–12`);
  }
  for (const k of ['website', 'sourceUrl']) {
    if (!item[k]) continue;
    try {
      if (!/^https?:$/.test(new URL(item[k]).protocol)) throw new Error();
    } catch {
      F(`data: ${item.id} malformed ${k} "${item[k]}"`);
    }
  }
}

/* ─────────────────────────  2. built output  ────────────────────────────── */

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(2);
}

const htmlFiles = [];
const allFiles = new Set();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else {
      allFiles.add('/' + path.relative(DIST, p).split(path.sep).join('/'));
      if (e.name.endsWith('.html')) htmlFiles.push(p);
    }
  }
})(DIST);

const pageUrl = (p) => {
  const r = '/' + path.relative(DIST, p).split(path.sep).join('/');
  return r.endsWith('/index.html') ? r.slice(0, -10) : r;
};
const htmlPaths = new Set(htmlFiles.map((p) => '/' + path.relative(DIST, p).split(path.sep).join('/')));

const resolves = (href) => {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return true;
  if (allFiles.has(clean)) return true;
  return htmlPaths.has(clean.replace(/\/$/, '') + '/index.html');
};

for (const source of expectedRedirectSources) {
  const redirect = configuredRedirects.get(source);
  if (!redirect) continue;
  if (resolves(source)) F(`redirects: legacy redirect shadows a built page: ${source}`);
  if (!resolves(redirect.destination)) F(`redirects: destination does not exist: ${redirect.destination}`);
}

const titles = new Map();
const descriptions = new Map();
const noindexPages = new Set();
const indexablePages = new Set();

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const u = pageUrl(file);
  const raw = '/' + path.relative(DIST, file).split(path.sep).join('/');
  const isExempt = (what) => exempt(u, what) || exempt(raw, what);

  const title = html.match(/<title>([\s\S]*?)<\/title>/);
  if (!title) {
    if (!isExempt('title')) F(`${u}: no <title>`);
  } else {
    const v = decode(title[1].trim());
    if (!v) F(`${u}: empty <title>`);
    if (!titles.has(v)) titles.set(v, []);
    titles.get(v).push(u);
  }

  const desc = html.match(/<meta name="description" content="([^"]*)"/);
  if (!desc) {
    if (!isExempt('description')) F(`${u}: no meta description`);
  } else {
    const v = decode(desc[1]);
    if (!v.trim()) F(`${u}: empty meta description`);
    if (v.length > MAX_DESC) F(`${u}: meta description ${v.length} chars (max ${MAX_DESC})`);
    if (/[,;]…$/.test(v)) F(`${u}: meta description truncated mid-list ("…${v.slice(-40)}")`);
    if (!descriptions.has(v)) descriptions.set(v, []);
    descriptions.get(v).push(u);
  }

  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/);
  if (!canonical) {
    if (!isExempt('canonical')) F(`${u}: no canonical`);
  } else {
    const c = canonical[1];
    if (!c.startsWith(ORIGIN)) F(`${u}: canonical is not on ${ORIGIN} (${c})`);
    else if (c.slice(ORIGIN.length) !== u) F(`${u}: canonical points elsewhere → ${c.slice(ORIGIN.length)}`);
  }
  if ((html.match(/rel="canonical"/g) || []).length > 1) F(`${u}: more than one canonical`);

  const robots = html.match(/<meta name="robots" content="([^"]*)"/);
  if (!robots) {
    if (!isExempt('robots')) F(`${u}: no robots meta`);
  } else if (/noindex/.test(robots[1])) noindexPages.add(u);
  else indexablePages.add(u);

  if (noindexPages.has(u) && html.includes('pagead/js/adsbygoogle.js'))
    F(`${u}: noindex page loads the advertising script`);
  if (u === '/outing-planner/' && /adsbygoogle|_vercel\/insights|localStorage|sessionStorage/.test(html))
    F(`${u}: planner must not load ads, analytics or persistent browser storage`);

  const [section, localSlug] = u.split('/').filter(Boolean);
  if (localSlug && (section === 'cities' || catSlugs.has(section))) {
    const pageListings = sourcedListings.filter((l) => l.citySlug === localSlug &&
      (section === 'cities' || l.category === section));
    if (!pageListings.length) F(`${u}: directory page has no sourced local listings`);
    if (!hasIndexableLocalContent(pageListings) && !noindexPages.has(u))
      F(`${u}: sparse local page must be noindex`);
    if (/Participating [^<]* locations in /i.test(html))
      F(`${u}: generated national-program city listings remain in the page`);
  }

  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length === 0 && !isExempt('h1')) F(`${u}: no <h1>`);
  if (h1s.length > 1) F(`${u}: ${h1s.length} <h1> elements`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      if (!JSON.parse(m[1])['@context']) F(`${u}: JSON-LD block missing @context`);
    } catch (e) {
      F(`${u}: invalid JSON-LD (${e.message.slice(0, 60)})`);
    }
  }

  // Data payloads are emitted with `set:html`, which does not escape. A listing
  // name containing "</script>" or a raw angle bracket would break out of the
  // block and corrupt the page, so prove each one still parses.
  for (const m of html.matchAll(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch (e) {
      F(`${u}: malformed application/json payload (${e.message.slice(0, 60)})`);
    }
  }

  for (const m of html.matchAll(/<img\b[^>]*>/g))
    if (!/\balt=/.test(m[0])) F(`${u}: <img> without alt`);

  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)) {
    const [tag, href] = [m[0], m[1]];
    if (/^(mailto:|tel:|javascript:|#)/.test(href)) continue;
    if (/^https?:\/\//.test(href)) {
      if (href.startsWith(ORIGIN) && !resolves(href.slice(ORIGIN.length) || '/'))
        F(`${u}: self-link 404 → ${href.slice(ORIGIN.length)}`);
      // Affiliate links must be tagged, or Amazon/Google can penalise the site.
      if (/amazon\.[a-z.]+/.test(href) && !/rel="[^"]*(sponsored|nofollow)/.test(tag))
        F(`${u}: Amazon link missing rel=sponsored/nofollow → ${href.slice(0, 60)}`);
      if (/target="_blank"/.test(tag) && !/rel="[^"]*noopener/.test(tag))
        W(`${u}: target=_blank without rel=noopener`);
      continue;
    }
    if (!href.startsWith('/')) continue;
    if (!resolves(href)) F(`${u}: broken internal link → ${href}`);
  }

  // Accessibility basics.
  if (!/<html[^>]*\blang=/.test(html) && !isExempt('lang')) F(`${u}: <html> without lang`);
  for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
    const attrs = m[2];
    const type = (attrs.match(/type="([^"]*)"/) || [])[1] || 'text';
    if (['hidden', 'submit', 'button', 'image'].includes(type)) continue;
    if (/aria-hidden="true"/.test(attrs)) continue; // honeypot / decorative
    const id = (attrs.match(/\bid="([^"]*)"/) || [])[1];
    const labelled =
      /aria-label(?:ledby)?=/.test(attrs) ||
      (id && new RegExp(`<label[^>]*\\bfor="${id}"`).test(html)) ||
      /<label[^>]*>\s*$/.test(html.slice(Math.max(0, m.index - 200), m.index));
    if (!labelled) F(`${u}: unlabelled form control (type=${type}${id ? `, id=${id}` : ''})`);
  }
  for (const attr of ['aria-labelledby', 'aria-controls', 'aria-describedby']) {
    for (const m of html.matchAll(new RegExp(`${attr}="([^"]+)"`, 'g')))
      for (const ref of m[1].split(/\s+/))
        if (!new RegExp(`\\bid="${ref}"`).test(html))
          F(`${u}: ${attr}="${ref}" references a missing id`);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  for (const d of new Set(ids.filter((v, i) => ids.indexOf(v) !== i)))
    F(`${u}: duplicate id="${d}"`);
}

for (const [t, pages] of titles)
  if (pages.length > 1) F(`duplicate <title> on ${pages.length} pages ("${t}") → ${pages.slice(0, 3).join(', ')}`);
for (const [, pages] of descriptions)
  if (pages.length > 1)
    F(`duplicate meta description on ${pages.length} pages → ${pages.slice(0, 3).join(', ')}`);

/* ─────────────────────────────  3. sitemap  ─────────────────────────────── */

const sitemapFile = path.join(DIST, 'sitemap-0.xml');
if (!fs.existsSync(sitemapFile)) {
  F('sitemap-0.xml was not generated');
} else {
  const xml = fs.readFileSync(sitemapFile, 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].slice(ORIGIN.length));
  const sitemapPaths = new Set(urls);
  for (const p of sitemapPaths) {
    if (!resolves(p)) F(`sitemap lists a URL that does not exist: ${p}`);
    // Sparse retained directory pages and utility pages must not be submitted.
    if (noindexPages.has(p)) F(`sitemap lists a noindex page: ${p}`);
  }
  // Validate both directions so page tags and sitemap membership cannot drift.
  for (const p of indexablePages) {
    if (!sitemapPaths.has(p) && !exempt(p, 'sitemap'))
      F(`indexable page missing from the sitemap: ${p}`);
  }
  console.log(
    `pages: ${htmlFiles.length}  indexable: ${indexablePages.size}  noindex: ${noindexPages.size}  sitemap: ${urls.length}`,
  );
}

/* ─────────────────────────────  report  ─────────────────────────────────── */

const group = (arr) => {
  const g = new Map();
  for (const m of arr) {
    const key = m.replace(/^\/[^:]*: /, '').replace(/→.*/, '→ …').slice(0, 70);
    if (!g.has(key)) g.set(key, []);
    g.get(key).push(m);
  }
  return g;
};

for (const [label, arr] of [['WARN', warn], ['FAIL', fail]]) {
  if (!arr.length) continue;
  console.log(`\n${label} (${arr.length})`);
  for (const [, items] of group(arr))
    console.log(`  ${items.length > 1 ? `[${items.length}x] ` : ''}${items[0].slice(0, 180)}`);
}

if (fail.length) {
  console.error(`\n✗ audit failed: ${fail.length} problem(s)`);
  process.exit(1);
}
console.log(`\n✓ audit passed${warn.length ? ` (${warn.length} warning(s))` : ''}`);
