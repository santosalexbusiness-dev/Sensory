/**
 * Site-wide configuration and editable knobs.
 *
 * The production domain itself lives in `astro.config.mjs` (the `site` field),
 * because the sitemap and robots.txt are generated from it at build time.
 * Everything in components reads the domain from `Astro.site`, so you only ever
 * set the URL in one place.
 */

export interface SiteConfig {
  /** Brand name, used in titles, the header, and structured data. */
  name: string;
  /** Short tagline shown in the header and on the homepage. */
  tagline: string;
  /** Default meta description / homepage description. */
  description: string;
  /** Who stands behind the listings (used for E-E-A-T + JSON-LD publisher). */
  author: string;
  /** Public contact address for corrections and submissions. */
  contactEmail: string;
  /** Twitter/X handle (with the @), used for Twitter card attribution. */
  twitter?: string;
  /** Open Graph locale. */
  locale: string;
  /** Google Search Console "HTML tag" verification token (the content="..." value). Empty = no tag. */
  googleSiteVerification: string;
  /** Google AdSense publisher ID (e.g. "ca-pub-6235181222799113"). Empty = no ad loader script. */
  adsensePublisherId: string;
  /** Amazon Associates tracking tag (e.g. "sensoryfri-20"). Appended to affiliate links; leave empty until you have it. */
  amazonAssociateTag: string;
  /** Email-list signup wiring for the "Get sensory-friendly events near you" forms. */
  newsletter: {
    /** Provider subscribe endpoint the form submits to. Empty = mailto fallback. */
    actionUrl: string;
    /**
     * PUBLIC API key sent with the subscribe request (Kit v3 api_key). This is
     * safe to expose in client-side code — it can only ADD subscribers, never
     * read your list. NEVER put the API *secret* here. Empty for providers that
     * don't need a key.
     */
    publicKey: string;
    /** Field name the provider expects for the address (Kit v3 tag subscribe: "email"). */
    emailField: string;
  };
  /** "Support the site" donation links. Leave a field empty to hide that button. */
  support: {
    kofi: string;
    buyMeACoffee: string;
    paypal: string;
    github: string;
    stripe: string;
  };
}

export const SITE: SiteConfig = {
  name: 'Sensory-Friendly Kids',
  tagline: 'Calm, verified places for sensory-sensitive kids',
  description:
    'A parent-built directory of sensory-friendly and autism-friendly places for kids, organized by category and city — with the sensory details up front.',
  author: 'Alex',
  contactEmail: 'info@sensoryfriendly.guide',
  locale: 'en_US',
  // ── Google Search Console: paste the content value from the "HTML tag" verification method here, then redeploy. ──
  googleSiteVerification: '',
  // ── Google AdSense: publisher ID from your AdSense account. Loads the ad code site-wide. Empty = no ad script. ──
  adsensePublisherId: 'ca-pub-6235181222799113',
  // ── Affiliate: paste your Amazon Associates tag here once approved (e.g. 'sensoryfri-20'). ──
  amazonAssociateTag: 'sensoryfrie04-20',
  // ── Email list: Kit (ConvertKit). Subscribes visitors to the "Sensory-Friendly Events" tag (id 20533650). publicKey is the v3 api_key — public/safe; the API *secret* is NOT stored here. ──
  newsletter: {
    actionUrl: 'https://api.convertkit.com/v3/tags/20533650/subscribe',
    publicKey: 'yk5qJQyvF_LRmutouH0l8A',
    emailField: 'email',
  },
  // ── Donations: paste a full URL for each method you set up; empty ones are hidden. ──
  support: {
    kofi: '', // e.g. https://ko-fi.com/yourname
    buyMeACoffee: '', // e.g. https://buymeacoffee.com/yourname
    paypal: '', // e.g. https://paypal.me/yourname
    github: '', // e.g. https://github.com/sponsors/yourname
    stripe: 'https://buy.stripe.com/4gMfZh7Nb3xycLA8nZ2wU00', // Stripe payment-link (donor chooses amount)
  },
};

/**
 * QUALITY GATE.
 * Minimum number of listings a (category × city) must have before its page is
 * generated. Cities below this threshold are skipped at build time so we never
 * publish thin, low-value pages that can drag down SEO for the whole site.
 */
export const MIN_LISTINGS_PER_CITY = 3;

/**
 * When true, any page built from placeholder sample data shows a visible banner.
 * Flip this to `false` once you have replaced ALL sample data with real,
 * verified listings.
 */
export const SHOW_PLACEHOLDER_WARNING = false;
