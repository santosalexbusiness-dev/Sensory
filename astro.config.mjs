// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
      // Keep utility endpoints out of the sitemap; only real pages belong there.
      filter: (page) => !page.endsWith('/robots.txt'),
    }),
  ],
});
