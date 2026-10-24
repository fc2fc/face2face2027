import type { APIRoute } from 'astro';
import { pages } from '../lib/content';

const SITE = 'https://www.fc2fc.co.il';

// Priority/changefreq by page type
function meta(page: any): { priority: string; freq: string } {
  if (page.type === 'home')           return { priority: '1.0', freq: 'weekly' };
  if (page.type === 'portfolio-item') return { priority: '0.7', freq: 'monthly' };
  return { priority: '0.8', freq: 'monthly' };
}

export const GET: APIRoute = () => {
  const today = new Date().toISOString().split('T')[0];

  const urls = pages
    .filter((p: any) => !['legal', 'not-found'].includes(p.type))
    .map((p: any) => {
      const path = p.old_path === '/' ? '' : p.old_path;
      const { priority, freq } = meta(p);
      return `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
