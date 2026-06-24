# Data directory — READ BEFORE PUBLISHING

All site content lives in this folder as JSON. **There are no placeholders** —
every listing is a real, source-linked place. Most carry `"status": "documented"`,
meaning the program/venue is real and sourced from official documentation but has
**not** been personally confirmed by your team. They show a "Documented · confirm
locally" badge and a `sourceUrl`.

> **Before relying on any listing, confirm the current details locally**
> (schedules, hours, and accommodations change). Upgrade a listing to
> `"status": "verified"` once your team has confirmed it against the standard on
> [`/how-we-verify`](../pages/how-we-verify.astro). Never invent listings — an
> unconfirmed "sensory-friendly" claim can send a family somewhere that doesn't
> actually accommodate their child.

`SHOW_PLACEHOLDER_WARNING` in [`src/site.config.ts`](../site.config.ts) is `false`
(no placeholder data remains). It only matters if you re-introduce sample data.

## Files

| File              | What it holds                                                        |
| ----------------- | -------------------------------------------------------------------- |
| `cities.json`     | The metros you cover. Fields: `slug`, `city`, `state`, `stateAbbr`, `lat`, `lng`, `seeded`. |
| `categories.json` | The category definitions (name, prose nouns, FAQs, schema type).     |
| `listings.json`   | Individual places. Each references a `category` and a `citySlug`.    |
| `programs.json`   | National/franchise programs, auto-expanded into cities (all `seeded` cities, or just those in `availableIn`). |

## The quality gate

A city page is only generated for a category if that city has at least
**`MIN_LISTINGS_PER_CITY`** (default **3**) listings. Cities with fewer are
skipped at build time so the site never publishes thin pages. The threshold
lives in `src/site.config.ts`. Watch the build output for a `[quality-gate]`
summary showing which pages were built and which were skipped.

See the root [`README.md`](../../README.md) for full instructions on adding
cities, listings, and new categories.
