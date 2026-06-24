# Sensory-Friendly Kids — programmatic SEO directory

A statically-generated directory of **sensory-friendly / autism-friendly places
and services for kids**, organized by **category × city**. It's built to scale to
thousands of SEO-optimized pages from structured JSON data — add data, get pages.

- **First category:** Sensory-Friendly Haircuts
- **Add new categories** (museums, indoor play gyms, sensory-friendly Santa
  events, …) **by adding data only — no code changes.**
- **Stack:** [Astro](https://astro.build) (static output) · TypeScript · Tailwind
  CSS v4 · `@astrojs/sitemap`
- **Output:** 100% static HTML — deploy free to Netlify, Vercel, or Cloudflare Pages.

> ### ℹ️ Listings are real but "documented", not yet personally verified
> Every listing is a real, source-linked place (no placeholders). Most carry
> `"status": "documented"` — sourced from official docs but not confirmed by your
> team — and show a "Documented · confirm locally" badge. Confirm details locally
> and upgrade to `"verified"` as you go. See [`src/data/README.md`](src/data/README.md).

---

## Prerequisites

- **Node.js 18.20+ / 20.3+ / 22+** and npm. (This project was scaffolded with
  Node 24 LTS.) Check with `node --version`.
  - On this machine, a portable Node was installed to `C:\Users\santo\nodejs`
    and added to your PATH — open a **new** terminal so `node`/`npm` resolve.

## Quick start

```bash
npm install      # install dependencies (already done during setup)
npm run dev      # start the local dev server
```

Then open **http://localhost:4321** in your browser. The dev server hot-reloads
as you edit data or components.

### All commands

| Command            | What it does                                              |
| ------------------ | -------------------------------------------------------- |
| `npm run dev`      | Start the dev server at `http://localhost:4321`.         |
| `npm run build`    | Build the static production site into `dist/`.           |
| `npm run preview`  | Serve the built `dist/` locally to preview production.   |
| `npm run check`    | Type-check the project with `astro check`.               |

---

## Project structure

```
.
├── astro.config.mjs        # site domain, trailing-slash, sitemap integration
├── postcss.config.mjs      # Tailwind CSS v4 (wired up via PostCSS)
├── netlify.toml            # Netlify build settings
├── vercel.json             # Vercel build settings
├── .nvmrc                  # Node version pin for hosts / CI
├── src/
│   ├── site.config.ts      # brand name, contact, QUALITY-GATE threshold, flags
│   ├── data/               # ← ALL CONTENT LIVES HERE (JSON)
│   │   ├── cities.json     # metros (with lat/lng + a `seeded` flag)
│   │   ├── categories.json
│   │   ├── listings.json   # individual places (placeholders + verified venues)
│   │   ├── programs.json   # national programs, auto-expanded into seeded cities
│   │   └── README.md       # data rules + placeholder warning
│   ├── lib/
│   │   ├── data.ts         # typed data access + the quality gate
│   │   ├── seo.ts          # titles, meta, intros, JSON-LD builders
│   │   └── utils.ts        # URL/date/string helpers
│   ├── components/         # Header, Footer, ListingCard, Faq, BaseHead, …
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro                 # homepage  →  /
│   │   ├── about.astro                 # /about/
│   │   ├── how-we-verify.astro         # /how-we-verify/
│   │   ├── robots.txt.ts               # generated /robots.txt
│   │   ├── search.astro                # zip-code radius search  →  /search/
│   │   ├── 404.astro
│   │   ├── cities/
│   │   │   ├── index.astro             # city tabs / directory  →  /cities/
│   │   │   └── [citySlug].astro        # city hub  →  /cities/san-antonio-tx/
│   │   └── [category]/
│   │       ├── index.astro             # category index  →  /sensory-friendly-haircuts/
│   │       └── [citySlug].astro        # category-in-city → /sensory-friendly-haircuts/austin-tx/
│   └── styles/global.css   # Tailwind import + calm, accessible theme tokens
└── public/                 # favicon.svg, og-default.svg (static assets)
```

### URL structure

| Page                | URL example                                     |
| ------------------- | ----------------------------------------------- |
| Homepage            | `/`                                             |
| Zip-code search     | `/search/` (and `/search/?zip=78205`)           |
| City directory/tabs | `/cities/`                                       |
| City hub            | `/cities/san-antonio-tx/` ("activities in …")   |
| Category index      | `/sensory-friendly-haircuts/`                   |
| Category in a city  | `/sensory-friendly-haircuts/austin-tx/`         |
| About               | `/about/`                                       |
| How we verify       | `/how-we-verify/`                               |
| Sitemap             | `/sitemap-index.xml` (auto-generated)           |
| Robots              | `/robots.txt` (auto-generated, links sitemap)   |

---

## The quality-gate rule (important for SEO)

A category-in-city page is **only generated if that city has at least 3 listings**
for the category (configurable via `MIN_LISTINGS_PER_CITY` in
`src/site.config.ts`). Cities with fewer are **skipped** at build time so the
site never ships thin, low-value pages that can hurt search rankings.

The logic lives in `getQualifyingCitiesForCategory()` in
[`src/lib/data.ts`](src/lib/data.ts). On every `dev`/`build`, a summary prints:

```
[quality-gate] Minimum 3 listings required per city page.
[quality-gate] BUILD  sensory-friendly-haircuts/austin-tx — 4 listing(s)
[quality-gate] BUILD  sensory-friendly-haircuts/denver-co — 3 listing(s)
[quality-gate] BUILD  sensory-friendly-haircuts/san-diego-ca — 3 listing(s)
```

> Want to see it skip? Remove listings from a city in `listings.json` until it
> has fewer than 3 and rebuild — that city's page disappears from the output and
> the sitemap, and its line shows `SKIP`.

---

## How to add a city

Add an object to [`src/data/cities.json`](src/data/cities.json):

```json
{ "slug": "portland-or", "city": "Portland", "state": "Oregon", "stateAbbr": "OR" }
```

- `slug` becomes the URL segment (`/sensory-friendly-haircuts/portland-or/`). Use
  lowercase, hyphenated, and unique.

A city does nothing on its own — it needs **3+ listings** for a category before
its page is generated (the quality gate).

## How to add a listing

Add an object to [`src/data/listings.json`](src/data/listings.json):

```json
{
  "id": "pdx-quiet-cuts",
  "name": "Quiet Cuts Kids Salon",
  "category": "sensory-friendly-haircuts",
  "citySlug": "portland-or",
  "address": "55 Calm St, Portland, OR 97201",
  "website": "https://example-real-salon.com",
  "phone": "(503) 555-0150",
  "sensoryFeatures": ["quiet hours", "noise-reducing headphones", "no clippers"],
  "ageRange": "2–12 years",
  "cost": "$30–$40",
  "hours": "Tue–Sat 9am–5pm",
  "sensoryEventDates": ["2026-09-13 (Quiet Sunday morning)"],
  "lastVerified": "2026-06-15",
  "sourceUrl": "https://example-real-salon.com/accessibility",
  "parentTip": "Ask for the 9am slot — it's the calmest of the week."
}
```

| Field               | Required | Notes                                                       |
| ------------------- | :------: | ----------------------------------------------------------- |
| `id`                |    ✓     | Unique; also used as the on-page anchor + JSON-LD id.       |
| `name`              |    ✓     | The business name.                                          |
| `category`          |    ✓     | Must match a `slug` in `categories.json`.                   |
| `citySlug`          |    ✓     | Must match a `slug` in `cities.json`.                       |
| `address`           |    ✓     | Full street address.                                        |
| `website` / `phone` |    ✓     | Official contact details.                                   |
| `sensoryFeatures`   |    ✓     | String array; rendered as chips and as schema amenities.    |
| `ageRange`          |    ✓     | e.g. `"2–12 years"`, `"All ages"`.                          |
| `cost`              |    ✓     | e.g. `"$25–$35"`, `"Call for pricing"`.                     |
| `hours`             |    ✓     | Human-readable opening hours.                               |
| `sensoryEventDates` |  optional | String array of special sensory-friendly dates.            |
| `lastVerified`      |    ✓     | `YYYY-MM-DD`. Shown as "Last verified …".                   |
| `sourceUrl`         |    ✓     | Where you confirmed the info.                               |
| `parentTip`         |    ✓     | One practical, human tip.                                   |

That's it — the city/category page picks up the new card automatically (and the
city page appears once it crosses the 3-listing threshold).

## How to add a whole new category (no code changes)

1. Add one object to [`src/data/categories.json`](src/data/categories.json):

   ```json
   {
     "slug": "sensory-friendly-museums",
     "name": "Sensory-Friendly Museums",
     "nameSingular": "Sensory-Friendly Museum",
     "serviceNoun": "museum visits",
     "placeNoun": "museum",
     "placeNounPlural": "museums",
     "schemaType": "Museum",
     "tagline": "Museums with quiet hours and low-sensory days for kids.",
     "description": "1–2 sentence intro shown on the category index page.",
     "guide": "A short paragraph of practical advice for this category.",
     "faqs": [
       { "question": "…", "answer": "…" },
       { "question": "…", "answer": "…" }
     ]
   }
   ```

   - `serviceNoun` / `placeNoun` / `placeNounPlural` are the nouns the page copy
     and meta descriptions are written from, so prose reads naturally for any
     category. `schemaType` is the [schema.org](https://schema.org) type used for
     each listing's `LocalBusiness` structured data (`Museum`, `AmusementPark`,
     `ChildCare`, …).

2. Add listings for it in `listings.json` with `"category": "sensory-friendly-museums"`.

3. Done. New routes (`/sensory-friendly-museums/` and its city pages), navigation,
   homepage cards, titles, meta, intros, sitemap entries, and JSON-LD are all
   generated automatically.

---

## Locations, the zip search, and national programs

### Cities & coordinates
Each city in `cities.json` has `lat`/`lng` (used by the zip-radius search) and a
`seeded` boolean. When `seeded: true`, every national program in `programs.json`
is automatically expanded into a listing for that city.

### National programs (`programs.json`)
Chain-wide, officially-documented programs (AMC Sensory Friendly Films, Chuck E.
Cheese Sensory Sensitive Sundays, etc.) are defined **once** and expanded across
all seeded cities at build time. To add one, add an object to `programs.json`
(`operator`, `category`, `website`, `sourceUrl`, `schedule`, `sensoryFeatures`,
`ageRange`, `cost`, `parentTip`, `lastVerified`) — it then appears in every
seeded city and on those city hubs automatically. Add an optional `recurrence`
array (e.g. `[{ "weekday": "Saturday", "weeks": [2, 4], "note": "family films" }]`)
and it also feeds each city's calendar (below).

### City hubs
`/cities/[citySlug]/` aggregates every category's listings for a city into one
**"Sensory-Friendly Activities in [City]"** page. A hub is built when the city
has 3+ listings total (the quality gate, applied across all categories combined).
`/cities/` lists every metro as tabs — live ones link to their hub, any without
enough listings show "coming soon".

### Per-city calendar
Each city hub has a **"Sensory-friendly calendar for [City]"** section
(`src/components/CityCalendar.astro`). It shows two things: a static list of
**recurring times** (e.g. "2nd & 4th Saturdays — family films"), and a
client-computed list of the **next concrete dates** (the next ~75 days), always
current relative to the visitor. It is built from two data sources, no backend:

- a listing's `recurrence` rules (weekday + which weeks of the month), and
- any specific `sensoryEventDates` (`"2026-07-18 (label)"`) on a listing.

A listing with neither simply doesn't appear in the calendar.

### Zip-code radius search (`/search/`)
A fully client-side, no-backend filter. The visitor enters a zip code; the page
geocodes it with the free [Zippopotam.us](https://api.zippopotam.us) API, computes
great-circle distance to every listing (using its `lat`/`lng`, or its city's as a
fallback), and shows matches within the chosen radius, sorted by distance. The
homepage hero box deep-links into it via `/search/?zip=NNNNN`.

### Listing trust levels (`status`)
Listings carry an optional `status`:

| status        | meaning                                                          | badge                          |
| ------------- | ---------------------------------------------------------------- | ------------------------------ |
| `placeholder` | sample data — replace before publishing                          | (sample-data banner on page)   |
| `documented`  | real, sourced from official docs, **not** personally confirmed   | "Documented · confirm locally" |
| `verified`    | fully verified to your How-We-Verify standard                    | "Verified"                     |

The seeded national programs and certified venues ship as `documented`, so they
are honestly labelled until your team confirms each one locally.

---

## SEO features built in

- Templated, per-page `<title>` and meta description from the data.
- `<link rel="canonical">` on every page.
- Open Graph + Twitter Card tags (default social image in `public/og-default.svg`).
- JSON-LD structured data: **BreadcrumbList**, **ItemList** (directory),
  **LocalBusiness** (one per listing, with sensory features as amenities),
  **FAQPage**, and **WebSite** on the homepage.
- Auto-generated `sitemap-index.xml` (via `@astrojs/sitemap`).
- Auto-generated `robots.txt` that allows crawling and links the sitemap.
- Clean, trailing-slash URLs and a custom 404 page.

### Before you go live

1. **Set your real domain** in [`astro.config.mjs`](astro.config.mjs) (`site:`).
   This drives canonical URLs, the sitemap, and robots.txt.
2. **Replace all placeholder listings** with real, verified data.
3. Update `SITE` (name, contact email, social handle) in
   [`src/site.config.ts`](src/site.config.ts) and set
   `SHOW_PLACEHOLDER_WARNING = false`.
4. Personalize `about.astro` and `how-we-verify.astro` (real names build trust).
5. Optionally replace `public/og-default.svg` with a 1200×630 **PNG/JPG** (some
   social platforms don't render SVG previews).

---

## Production build

```bash
npm run build      # outputs static files to dist/
npm run preview    # preview the built site locally
```

`dist/` is a plain folder of static HTML/CSS/JS — no server runtime required.

## Deploying free (high level)

Because the output is fully static, any of these free tiers work. Build command
is **`npm run build`** and the publish/output directory is **`dist`** everywhere.
This repo already includes **`netlify.toml`**, **`vercel.json`**, and **`.nvmrc`**,
so Netlify and Vercel pick up the build command, output directory, and Node
version automatically — just connect the repo.

- **Netlify** — "Add new site → Import from Git". Build: `npm run build`,
  Publish directory: `dist`. (Or drag-and-drop the `dist/` folder.)
- **Vercel** — Import the repo; Vercel detects Astro automatically (Output: `dist`).
- **Cloudflare Pages** — "Create application → Pages → Connect to Git". Framework
  preset: Astro. Build: `npm run build`, Output: `dist`.

After the first deploy, set `site` in `astro.config.mjs` to your live URL and
redeploy so canonical URLs, the sitemap, and robots.txt use the real domain. Then
submit `https://your-domain/sitemap-index.xml` in Google Search Console.

---

## License / use

Starter scaffold for your own directory. The included listings are fictional
placeholders — do not publish them.
