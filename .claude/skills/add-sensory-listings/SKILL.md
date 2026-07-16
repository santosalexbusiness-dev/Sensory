---
name: add-sensory-listings
description: >-
  Research, add, and deploy new cities and sensory-friendly activity listings
  for sensoryfriendly.guide. Use this skill whenever the user asks to "add more
  cities", "add more activities", "add listings", "add venues", "find sensory
  friendly places", "grow the site", "add more", or names a specific city,
  state, venue, or chain to add — even if they phrase it casually. It encodes
  the full pipeline: gap analysis, sourced web research with strict
  no-fabrication rules, dedupe, data merge, build, deploy, and live
  verification, plus the project's accumulated research knowledge (proven
  source veins and known dead-ends).
---

# Add sensory-friendly cities & listings

This is the growth pipeline for the directory in this repo. The product is
trust: every listing is a real venue with a real, documented sensory program,
source-linked so a parent can verify it. A fabricated or stale listing can send
a family somewhere that can't accommodate their child — so the integrity rules
below outrank speed, listing counts, and user enthusiasm for big numbers.

## Non-negotiables

1. **Documented or skipped.** A venue gets a listing only when a sensory
   program/accommodation is documented at a real URL (see source tiers in
   `references/research-veins.md`). "Probably has one" or "reviews say it's
   autism-friendly" is a skip. Report skips honestly — the user values them.
2. **Dedupe before writing.** Marquee venues in big metros are usually already
   listed. Grep `src/data/listings.json` for the venue **name fragments**, not
   just your candidate id — past duplicates (`wrts-north-orlando`,
   `arizona-science-center`, Glazer, Explora, Oregon Zoo, Crayola MOA,
   Shreveport Aquarium) all had different ids than the existing entry.
3. **Verify links live.** curl every `sourceUrl` you didn't just receive from a
   search result (bot-blocked 403/405/429 = fine; 404/ENOTFOUND = find another
   source or skip). Never use dated event-page URLs (they expire) — prefer
   evergreen `/accessibility` pages. Avoid Facebook-post sources.
4. **Chains use "participating locations" framing.** Program listings (in
   `programs.json`) and chain venues must tell parents to confirm with their
   local location. Never claim a specific schedule the source doesn't state.
5. **Coming soon = not yet.** A park/venue that hasn't opened gets nothing.

## The pipeline

### 1. Pick targets (gap analysis)

Run whichever gap query fits the request — these are ready to paste:

```bash
# per-state local-listing coverage (find states/cities needing depth)
node -e "const l=require('./src/data/listings.json'),c=require('./src/data/cities.json');const st={};c.forEach(x=>{if(!x.country)st[x.slug]=x.stateAbbr});const per={};l.forEach(x=>{const s=st[x.citySlug];if(s)per[s]=(per[s]||0)+1});console.log(Object.entries(per).sort((a,b)=>a[1]-b[1]).slice(0,15))"

# category x city pairs at exactly 2 (one sourced listing unlocks a whole page)
npm run build 2>&1 | grep -E "quality-gate skip" | grep -E "— 2$"

# what a city already has (dedupe + depth check)
node -e "require('./src/data/listings.json').filter(l=>l.citySlug==='CITY-SLUG').forEach(l=>console.log(l.id,'|',l.category,'|',l.name))"
```

The highest-value listing is one that takes a category×city from 2→3 (unlocks
a page — gate is `MIN_LISTINGS_PER_CITY = 3`) or gives a city/state its first
local venue. New **US cities** are near-free: national programs auto-build a
hub + movies page for any seeded US city. UK/IE cities also auto-qualify.
**Canada/Australia cities do NOT** (only 1–2 country chains — they need local
anchors first or their hub won't build).

### 2. Research

Use `firecrawl_search` (send `firecrawl_search_feedback` after each search you
use — it refunds a credit). Fall back to WebSearch if firecrawl is down.
**Read `references/research-veins.md` before searching** — it lists the proven
source veins, per-country patterns, chain inventories already covered, and the
dead-ends already checked (don't re-burn searches on those).

For each candidate capture: official program page URL, street address, lat/lng
(venue-accurate, not city-center), schedule/recurrence, 3–5 concrete sensory
features **from the source**, cost, and one genuinely useful parent tip.

### 3. Write the batch and merge

Write a batch JSON and run the bundled merger — don't hand-edit the data files
and don't rewrite the merge logic:

```bash
node .claude/skills/add-sensory-listings/scripts/merge-data.cjs path/to/batch.json
```

Batch format and a complete listing example live in
`references/research-veins.md` (§ Data formats). The script validates
everything (dup ids, unknown city slugs/categories, bad coords/URLs, missing
fields), skips duplicates with a log line instead of failing, and prints
before→after counts. Set `lastVerified` to today.

### 4. Build and check the gate

```bash
npm run build > /tmp/build.log 2>&1; grep -E "page\(s\) built" /tmp/build.log
grep -E "quality-gate BUILD" /tmp/build.log | grep -E "your-city-slugs"
```

Spot-check rendered output: `grep "Venue Name" dist/cities/<slug>/index.html`.
If a page you expected didn't unlock, the category count is still under 3 —
that's fine, hubs still show the listing.

### 5. Deploy and verify live

```bash
git add src/data/ && git commit -m "..." && git push origin main
```

`git push origin main` auto-deploys to sensoryfriendly.guide (~2–4 min for a
full build). Then poll until live and verify the actual content:

```bash
for i in 1 2 3 4 5 6 7 8 9 10; do ok=$(curl -s https://sensoryfriendly.guide/cities/<slug>/ | grep -c "Venue Name"); [ "$ok" -ge 1 ] && echo "live ($i)" && break; sleep 20; done
```

**If it's not live after ~4 minutes, don't keep polling** — the Vercel webhook
has silently missed a push before. Check with the Vercel MCP
(`list_deployments`, ids in `.vercel/project.json`): if the newest deployment's
commit isn't yours, retrigger with
`git commit --allow-empty -m "Retrigger deploy" && git push origin main`.

### 6. Close the loop

- Update auto-memory: counts in `MEMORY.md`'s index line, and append a dated
  entry to `part2-city-listings-status.md` (what was added, sources, what was
  **skipped and why**, new dead-ends/veins discovered).
- Report to the user: what went live (verified, with counts), what was skipped
  for integrity, and where the next batch's value is.

## Report format

End with: listings/cities/pages before→after · table or bullets of venues with
their documented program (one line each) · integrity skips · live-verification
proof (commit hash + spot-check results) · one honest note on where the
remaining value is.
