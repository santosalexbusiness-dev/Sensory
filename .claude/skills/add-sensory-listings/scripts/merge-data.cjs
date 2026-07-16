#!/usr/bin/env node
/**
 * Validating merger for sensoryfriendly.guide data batches.
 *
 * Usage:  node .claude/skills/add-sensory-listings/scripts/merge-data.cjs <batch.json> [--dry-run]
 *
 * Batch shape (all keys optional):
 *   {
 *     "cities":   [ {slug, city, state, stateAbbr, lat, lng, seeded, country?, countryCode?} ],
 *     "listings": [ {id, name, category, citySlug, address, website, lat, lng, status,
 *                    sensoryFeatures[], ageRange, cost, hours, lastVerified, sourceUrl,
 *                    parentTip, phone?, schedule?, recurrence?} ],
 *     "programCityAdds": { "<program-id>": ["city-slug", ...] }
 *   }
 *
 * Behavior:
 *  - Hard-fails on structural errors (unknown citySlug/category, bad coords/URLs,
 *    missing required fields) BEFORE writing anything.
 *  - Skips duplicate ids/slugs idempotently (logged, not fatal).
 *  - Warns on possible venue duplicates (same city + similar name) — review these!
 *  - --dry-run validates and reports without writing.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..'); // repo root from .claude/skills/<skill>/scripts/
const DATA = (f) => path.join(ROOT, 'src', 'data', f);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const batchPath = args.find((a) => !a.startsWith('--'));
if (!batchPath) {
  console.error('Usage: node merge-data.cjs <batch.json> [--dry-run]');
  process.exit(1);
}

const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const cities = JSON.parse(fs.readFileSync(DATA('cities.json'), 'utf8'));
const listings = JSON.parse(fs.readFileSync(DATA('listings.json'), 'utf8'));
const programs = JSON.parse(fs.readFileSync(DATA('programs.json'), 'utf8'));
const categories = JSON.parse(fs.readFileSync(DATA('categories.json'), 'utf8')).map((c) => c.slug);

const errors = [];
const warnings = [];
const skips = [];

// ── validate + stage cities ──
const citySlugs = new Set(cities.map((c) => c.slug));
const newCities = [];
for (const c of batch.cities || []) {
  if (citySlugs.has(c.slug)) { skips.push(`city (already exists): ${c.slug}`); continue; }
  for (const f of ['slug', 'city', 'state', 'stateAbbr']) if (!c[f]) errors.push(`city ${c.slug || '?'}: missing ${f}`);
  if (typeof c.lat !== 'number' || typeof c.lng !== 'number' || c.lat === 0 || Math.abs(c.lat) > 72 || Math.abs(c.lng) > 180)
    errors.push(`city ${c.slug}: bad coords ${c.lat},${c.lng}`);
  if (c.country && !c.countryCode) errors.push(`city ${c.slug}: country without countryCode`);
  if (c.seeded !== true) errors.push(`city ${c.slug}: seeded must be true`);
  newCities.push(c);
  citySlugs.add(c.slug);
}

// ── validate + stage listings ──
const ids = new Set(listings.map((l) => l.id));
const nameKey = (l) => l.citySlug + '|' + l.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 22);
const nameKeys = new Map(listings.map((l) => [nameKey(l), l.id]));
const isUrl = (u) => /^https?:\/\/.+/.test(u || '');
const today = new Date().toISOString().slice(0, 10);
const newListings = [];
for (const l of batch.listings || []) {
  if (ids.has(l.id)) { skips.push(`listing (duplicate id): ${l.id}`); continue; }
  const near = nameKeys.get(nameKey(l));
  if (near) warnings.push(`POSSIBLE DUPLICATE VENUE: "${l.name}" in ${l.citySlug} looks like existing listing "${near}" — verify before shipping!`);
  for (const f of ['id', 'name', 'category', 'citySlug', 'address', 'website', 'status', 'sensoryFeatures', 'ageRange', 'cost', 'hours', 'lastVerified', 'sourceUrl', 'parentTip'])
    if (l[f] === undefined || l[f] === '') errors.push(`listing ${l.id || '?'}: missing ${f}`);
  if (!citySlugs.has(l.citySlug)) errors.push(`listing ${l.id}: unknown citySlug ${l.citySlug}`);
  if (!categories.includes(l.category)) errors.push(`listing ${l.id}: unknown category ${l.category}`);
  if (l.status !== 'documented' && l.status !== 'verified') errors.push(`listing ${l.id}: status must be documented|verified`);
  if (!isUrl(l.website) || !isUrl(l.sourceUrl)) errors.push(`listing ${l.id}: website/sourceUrl must be full URLs`);
  if (/facebook\.com\/.+\/posts\//.test(l.sourceUrl || '')) warnings.push(`listing ${l.id}: Facebook-post sourceUrl — these age badly, prefer an official page`);
  if (typeof l.lat !== 'number' || typeof l.lng !== 'number' || l.lat === 0) errors.push(`listing ${l.id}: bad coords (map pin + ZIP search need them)`);
  if (!Array.isArray(l.sensoryFeatures) || l.sensoryFeatures.length < 3) errors.push(`listing ${l.id}: need >=3 sensoryFeatures`);
  if (l.lastVerified !== today) warnings.push(`listing ${l.id}: lastVerified is ${l.lastVerified}, expected today (${today})`);
  if (l.phone === undefined) l.phone = '';
  newListings.push(l);
  ids.add(l.id);
}

// ── validate + stage program city additions ──
const programAdds = [];
for (const [pid, slugsToAdd] of Object.entries(batch.programCityAdds || {})) {
  const p = programs.find((x) => x.id === pid);
  if (!p) { errors.push(`programCityAdds: no program with id ${pid}`); continue; }
  if (!Array.isArray(p.availableIn)) { errors.push(`program ${pid} has no availableIn (it is country-wide; scoping it would shrink coverage)`); continue; }
  for (const s of slugsToAdd) {
    if (!citySlugs.has(s)) { errors.push(`program ${pid}: unknown city ${s}`); continue; }
    if (p.availableIn.includes(s)) { skips.push(`program ${pid}: already available in ${s}`); continue; }
    programAdds.push([p, s]);
  }
}

// ── report ──
if (warnings.length) { console.log('\nWARNINGS:'); warnings.forEach((w) => console.log('  ! ' + w)); }
if (skips.length) { console.log('\nSKIPPED (idempotent):'); skips.forEach((s) => console.log('  - ' + s)); }
if (errors.length) {
  console.log('\nERRORS (nothing written):');
  errors.forEach((e) => console.log('  x ' + e));
  process.exit(1);
}

console.log(`\ncities:   ${cities.length} -> ${cities.length + newCities.length}`);
console.log(`listings: ${listings.length} -> ${listings.length + newListings.length}`);
if (programAdds.length) console.log(`program city adds: ${programAdds.length}`);

if (dryRun) { console.log('\n--dry-run: validation passed, nothing written.'); process.exit(0); }

if (newCities.length) fs.writeFileSync(DATA('cities.json'), JSON.stringify(cities.concat(newCities), null, 2) + '\n');
if (newListings.length) fs.writeFileSync(DATA('listings.json'), JSON.stringify(listings.concat(newListings), null, 2) + '\n');
if (programAdds.length) {
  for (const [p, s] of programAdds) p.availableIn.push(s);
  fs.writeFileSync(DATA('programs.json'), JSON.stringify(programs, null, 2) + '\n');
}
console.log('\nWritten. Next: npm run build, check the quality-gate output, then commit/push/verify live.');
