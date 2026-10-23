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
  build: { format: 'file' },
  redirects,
  integrations: [sitemap()],
});
