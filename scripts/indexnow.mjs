// Notifies Bing/Yandex/Seznam (IndexNow) of every URL in the freshly built sitemap.
// Runs only on Vercel production deploys and never fails the build.
import { readdirSync, readFileSync } from 'node:fs';

const KEY = 'ff39e16cb452a6654050b38514628a21';
const HOST = 'www.fc2fc.co.il';

if (process.env.VERCEL_ENV !== 'production') {
  console.log('[indexnow] skipped (not a production deploy)');
  process.exit(0);
}
try {
  const urls = new Set();
  for (const f of readdirSync('dist').filter((n) => /^sitemap-\d+\.xml$/.test(n))) {
    for (const m of readFileSync('dist/' + f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1]);
  }
  if (!urls.size) throw new Error('no URLs found in dist sitemap');
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: [...urls] }),
  });
  console.log(`[indexnow] submitted ${urls.size} URLs -> HTTP ${res.status}`);
} catch (e) {
  console.log('[indexnow] failed (ignored):', e.message);
}
