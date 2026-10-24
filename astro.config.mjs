// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 301 redirects for old Site123 URLs (generated from redirects.json during the migration)
const { astro: redirects } = JSON.parse(readFileSync(new URL('./redirects.json', import.meta.url), 'utf-8'));

export default defineConfig({
  site: 'https://www.fc2fc.co.il',
  // Old URLs have no trailing slash (/שירותים, not /שירותים/), so build /x.html instead of /x/index.html
  trailingSlash: 'never',
  // inlineStylesheets: put the CSS in a <style> in every page instead of a render-blocking <link>.
  // The CSS is ~12KB compressed, so the first visit costs the same bytes but one less round trip
  // (the stylesheet used to block first paint, and fonts were only discovered after it arrived).
  build: { format: 'file', inlineStylesheets: 'always' },
  redirects,
  integrations: [sitemap()],
});
