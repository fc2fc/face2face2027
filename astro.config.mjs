// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 301 redirects for old Site123 URLs (generated from redirects.json during the migration)
const { astro: redirects } = JSON.parse(readFileSync(new URL('./redirects.json', import.meta.url), 'utf-8'));

// Pages marked noindex (157 duplicate gallery-item pages) must not be listed in the sitemap.
const content = JSON.parse(readFileSync(new URL('./src/data/site-content.json', import.meta.url), 'utf-8'));
const noindex = new Set(content.pages.filter((p) => String(p.seo?.robots ?? '').includes('noindex')).map((p) => p.old_path));

export default defineConfig({
  site: 'https://www.fc2fc.co.il',
  // Old URLs have no trailing slash (/שירותים, not /שירותים/), so build /x.html instead of /x/index.html
  trailingSlash: 'never',
  // inlineStylesheets: put the CSS in a <style> in every page instead of a render-blocking <link>.
  // The CSS is ~12KB compressed, so the first visit costs the same bytes but one less round trip
  // (the stylesheet used to block first paint, and fonts were only discovered after it arrived).
  build: { format: 'file', inlineStylesheets: 'always' },
  redirects,
  integrations: [
    sitemap({
      filter: (url) => {
        const path = decodeURI(new URL(url).pathname);
        return !noindex.has(path) && path !== '/404';
      },
    }),
  ],
});
