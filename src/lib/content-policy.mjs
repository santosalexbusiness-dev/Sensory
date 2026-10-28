/**
 * Shared editorial policy for directory pages and their sitemap entries.
 * Three complete local entries is this site's starting editorial threshold,
 * not a Google or AdSense minimum, and does not guarantee search/ad approval.
 */
export const MIN_COMPLETE_LOCAL_LISTINGS = 3;

/** @param {any} listing */
export function isSourcedLocalListing(listing) {
  return Boolean(
    listing.citySlug && listing.name && listing.address &&
    listing.status !== 'placeholder' && !/placeholder/i.test(listing.name) &&
    /^https?:\/\//.test(listing.sourceUrl || '') &&
    !/^participating |^various |^multiple /i.test(listing.address),
  );
}

/** A local row must have usable source and visit-planning details to count.
 * @param {any} listing
 */
export function isCompleteLocalListing(listing) {
  return isSourcedLocalListing(listing) &&
    !/see (location page|website|schedule|official)|^select /i.test(listing.address) &&
    /^https?:\/\//.test(listing.website || '') &&
    /^\d{4}-\d{2}-\d{2}$/.test(listing.lastVerified || '') &&
    Array.isArray(listing.sensoryFeatures) && listing.sensoryFeatures.length > 0 &&
    ['cost', 'ageRange', 'parentTip'].every((key) => String(listing[key] || '').trim()) &&
    Boolean(String(listing.hours || listing.schedule || '').trim());
}

/** @param {any[]} listings */
export function hasIndexableLocalContent(listings) {
  const complete = listings.filter(isCompleteLocalListing);
  return new Set(complete.map((listing) => listing.id)).size >= MIN_COMPLETE_LOCAL_LISTINGS;
}

/**
 * Reconstruct the old routes only, to preserve existing links during migration.
 * Program availability is deliberately never converted into venue records.
 * @param {any[]} cities
 * @param {any[]} listings
 * @param {any[]} programs
 */
export function legacyDirectoryPaths(cities, listings, programs) {
  const counts = new Map();
  const add = (path) => counts.set(path, (counts.get(path) || 0) + 1);
  for (const listing of listings) {
    add(`/cities/${listing.citySlug}/`);
    add(`/${listing.category}/${listing.citySlug}/`);
  }
  const superseded = new Set(listings.filter((l) => l.supersedesProgram)
    .map((l) => `${l.supersedesProgram}__${l.citySlug}`));
  for (const program of programs) {
    const targets = cities.filter((city) => program.availableIn?.length
      ? program.availableIn.includes(city.slug)
      : city.seeded && (city.countryCode || 'US') === (program.country || 'US'));
    for (const city of targets) {
      if (superseded.has(`${program.id}__${city.slug}`)) continue;
      add(`/cities/${city.slug}/`);
      add(`/${program.category}/${city.slug}/`);
    }
  }
  return new Set([...counts].filter(([, count]) => count >= 3).map(([path]) => path));
}
