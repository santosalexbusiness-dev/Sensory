import type { APIRoute } from 'astro';

/**
 * Generates /robots.txt at build time. Allows all crawlers and points them at
 * the sitemap, using whatever domain is set as `site` in astro.config.mjs.
 */
export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = site
    ? new URL('sitemap-index.xml', site).href
    : '/sitemap-index.xml';

  const body = `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
