# Research knowledge base — sources, veins, dead-ends, data formats

Accumulated from ~15 research batches (June–July 2026, ~520 listings). Update
this file when a batch discovers a new vein or confirms a new dead-end.

## Contents
- Source tiers (what counts as "documented")
- Proven research veins
- Chains already covered (and how their scoping works)
- Per-country notes
- Dead-ends already checked
- Data formats (city, listing, program, batch file)
- Quality gate mechanics
- Search query patterns that work

## Source tiers

1. **Best:** the venue's own accessibility/sensory program page
   (`/accessibility`, `/sensory-friendly`, `/plan-your-visit/accessibility`).
2. **Strong:** certifier pages — `venue.kulturecity.org/venues/<slug>`
   (KultureCity), `ibcces.org/blog/...` + autismtravel.com (IBCCES Certified
   Autism Center), official partner orgs (e.g., a state Autism Society's venue
   directory or event calendar), corporate program announcements
   (e.g., corporate.walmart.com).
3. **Acceptable:** official tourism CVBs (visitpensacola.com,
   visitwinstonsalem.com, springfieldmo.org), regional accessibility
   directories with per-venue detail (twentyonesenses.org), local news
   coverage of a program launch (used for facts, prefer pairing with venue
   site as `website`).
4. **Not acceptable as sole source:** TripAdvisor/Yelp reviews, generic blog
   listicles, Facebook posts (block bots, age poorly), "designed with sensory
   elements" marketing copy with no actual program, dated one-off event pages.

## Proven research veins (highest hit-rate first)

- **KultureCity-certified zoos/aquariums/museums** — hundreds of venues;
  each has an official venue page. The single most reliable vein.
- **Children's museums & science centers** — "sensory friendly
  hours/mornings/Sundays"; nearly every mid-size city's children's museum has
  one. Weekly programs (Hands-on House Lancaster, Buffalo History Museum) are
  gold.
- **IBCCES Certified Autism Centers** — theme parks, aquariums, whole resorts.
  Chain-wide certs found so far: all Meow Wolf locations, all US LEGOLAND
  resorts, Sesame Place (both), Story Land (first amusement park ever).
- **Big-city ART museums** — sensory-friendly mornings/sensory kits; the
  reliable "3rd museum" that unlocks a museums page.
- **Destination parks/resorts** — calming rooms are now standard at the top
  tier: Dollywood, Silver Dollar City (×2), Hersheypark, Cedar Point, all four
  US Kalahari resorts (WI Dells, Sandusky, Poconos, Round Rock).
- **We Rock the Spectrum sensory gyms** — 212 locations, each franchise has an
  official site (`werockthespectrum<city>.com`); every one is a valid play
  listing. Get the street address from the franchise site or its Yelp.
- **Library sensory storytimes** — library systems publish these well.
- **UK/IE**: museum "relaxed sessions / early birds / quiet mornings", SEA LIFE
  "Quiet at the Aquarium" (UK sites only), theatre relaxed performances,
  National Autistic Society-affiliated venues. Bath/Oxford/Cambridge museums
  still unresearched (open vein).

## Chains already covered (don't re-add; extend `availableIn` instead)

In `programs.json` (auto-expand into cities):
- US-wide (no availableIn): AMC, Regal, Cinemark, Chuck E. Cheese, **Sky Zone
  Sensory Hours**, **Walmart daily sensory hours 8–10am** (shopping category).
- Scoped by `availableIn`: **Urban Air** (~35 verified cities — verify a park
  exists and is OPEN via `urbanair.com/geo/united-states/<state>` before adding
  a city; Sioux Falls was "coming soon" and excluded), **Marcus Theatres Reel
  Movies** (18 metros from the official participating list), Snip-its,
  Sharkey's.
- UK: ODEON, Cineworld, Vue. IE: ODEON ROI, Omniplex, IMC. AU: Event, HOYTS
  (+Village Melbourne). CA: Cineplex (+Landmark West/ON).

As individual listings: LEGO/LEGOLAND Discovery Centers (Boston, Philadelphia,
KC, Bay Area, Chicago, Michigan, Atlanta), SEA LIFE US (Michigan, MOA, KC,
Grapevine, Orlando) + 4 UK, Meow Wolf ×5, WRTS in ~15 metros, Crayola (MOA,
Easton, Orlando). **Merlin gotcha:** each location names its sensory page
differently — the URL pattern does NOT generalize; verify per location
(unverified: LDC Columbus/Arizona/San Antonio/NJ; SEA LIFE
Charlotte/Arizona/San Antonio/NJ).

## Per-country notes

- **US city = zero-touch**: seeded city auto-gets 6 program listings → hub +
  movies page build immediately. Same for UK/IE (3 chains each).
- **Canada/Australia: NOT zero-touch** — 1–2 national chains only; a new city
  needs local anchor venues to reach the 3-listing hub gate, or nothing builds
  (tried and reverted: Winnipeg, Quebec City, Hamilton, Canberra, Newcastle
  NSW).
- International city entry needs `country` + `countryCode` fields and a
  sensible `state`/`stateAbbr` (UK→"UK", Ireland→"Ireland", CA→province,
  AU→state).

## Dead-ends already checked (skip unless re-checking deliberately)

No documented sensory program as of July 2026: Alaska Zoo, Hawaii Children's
Discovery Center, Sea Life Park HI, Bishop Museum (tips only), Museum of
Idaho, spectrUM Missoula, Museum of the Rockies (Bozeman), Cheyenne Children's
Museum (sensory room but no program page), Oakland Zoo, Washington Pavilion
(Sioux Falls), Delaware Children's Museum, Pensacola MESS Hall, IMAG Fort
Myers, Don Harrington (Amarillo), NEW Zoo (Green Bay), Discovery Children's
Museum (Las Vegas), WonderLab Bloomington (immunocompromised hours only),
Terre Haute CM (baby class only), Morey's Piers (access guide only), Heritage
Farm WV (unconfirmed), Science Spectrum Lubbock (page removed), Exploreum
Mobile (2019-only), Great Wolf Lodge, MIM & Phoenix Art Museum, Yale Peabody,
Savannah venues, Greensboro 3rd museum (History/Weatherspoon/ICRCM), Houston
3rd attraction (Downtown Aquarium/Kemah), Seattle 3rd attraction, Atlanta 3rd
theater, SEA LIFE Blackpool quiet page, NYC-borough Urban Air.

## Data formats

### Batch file (input to scripts/merge-data.cjs)

```json
{
  "cities": [
    { "slug": "example-tx", "city": "Example", "state": "Texas", "stateAbbr": "TX", "lat": 30.1, "lng": -97.5, "seeded": true }
  ],
  "listings": [ { "...": "see listing example below" } ],
  "programCityAdds": { "urban-air-sensory-play": ["example-tx"] }
}
```

All keys optional. City slug convention: `city-name-st` (US), `city-uk`,
`city-ie`, `city-on`/`city-nsw` etc.

### Complete listing example (copy this shape exactly)

```json
{
  "id": "venue-name-cityslug",
  "name": "Venue Name — Program Name (or certification)",
  "category": "sensory-friendly-museums",
  "citySlug": "example-tx",
  "address": "123 Main St, Example, TX 75001",
  "website": "https://venue.org/accessibility",
  "phone": "",
  "lat": 30.1234,
  "lng": -97.5678,
  "status": "documented",
  "recurrence": [{ "weekday": "Sunday", "weeks": [2], "note": "9–11am, dimmed lights" }],
  "schedule": "Sensory mornings on the second Sunday, 9–11am",
  "sensoryFeatures": [
    "fact taken from the source page",
    "another documented accommodation",
    "3–5 total, concrete, never invented"
  ],
  "ageRange": "All ages",
  "cost": "Standard admission; sensory bags free",
  "hours": "See website for current hours",
  "lastVerified": "YYYY-MM-DD (today)",
  "sourceUrl": "https://venue.org/accessibility",
  "parentTip": "One genuinely useful, specific tip a local parent would give — timing, quiet zones, what to grab at the desk, real distances (\"in Lehi, ~20 min north of Provo\")."
}
```

Notes: `recurrence`/`schedule` only when the source states them (`weeks: [-1]`
= last week of month; omit `weeks` entries for weekly). Categories:
sensory-friendly-{haircuts,museums,movies,play,attractions,theater,shopping},
inclusive-playgrounds, sensory-storytime. Coordinates must be venue-accurate —
they place the map pin and power ZIP-radius search.

### Program entry (programs.json — only for true chains)

Same fields minus address/coords/citySlug, plus `operator`, optional
`availableIn` (city-slug allowlist) and `country` ("GB"/"IE"/"AU"/"CA"; absent
= US). No `availableIn` = expands into EVERY city of that country — only
appropriate for genuinely ubiquitous chains (the Chuck E. Cheese precedent).

## Quality gate mechanics

- Category×city page builds at **≥3 listings** in that category (programs
  count). City hub builds at **≥3 total**. Below-gate listings still render on
  hubs and in search — never force a weak 3rd listing to unlock a page.
- Site-count arithmetic: each new US/UK/IE city ≈ +2 pages; each unlock = +1.

## Search query patterns that work

- `"<venue>" sensory friendly autism` — the workhorse.
- `<city> sensory friendly autism kids museum` — city sweep.
- `<chain> "Certified Autism Center" IBCCES` — cert check.
- `site:<venue-domain> sensory` via tavily/firecrawl — find the official page.
- Address hunting: `<franchise name> <city> address` (franchise sites + Yelp).
- After firecrawl searches you used, call `firecrawl_search_feedback`
  (rating + valuableSources/missingContent) — refunds 1 of 2 credits.
