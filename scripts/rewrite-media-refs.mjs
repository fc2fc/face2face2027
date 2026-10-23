// One-off migration step (after convert-webp.mjs): point every media reference at the new files.
// Page images -> .webp; og/twitter images -> /assets/media/og/<name>.jpg.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pub = join(root, 'public');
const RE = /^\/assets\/media\/(uploads|youtube|brand)\/([^/]+)\.(png|jpe?g)$/i;
const missing = new Set();

const toWebp = (s) => {
  const m = s.match(RE);
  if (!m) return s;
  const out = `/assets/media/${m[1]}/${m[2]}.webp`;
  if (!existsSync(join(pub, out))) missing.add(out);
  return out;
};
const toOg = (s) => {
  const m = s?.match(RE);
  if (!m) return s;
  const out = `/assets/media/og/${m[2]}.jpg`;
  if (!existsSync(join(pub, out))) missing.add(out);
  return out;
};
const walk = (o) => {
  if (Array.isArray(o)) return o.map(walk);
  if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)]));
  return typeof o === 'string' ? toWebp(o) : o;
};

// site-content.json
const contentPath = join(root, 'src/data/site-content.json');
const content = JSON.parse(readFileSync(contentPath, 'utf-8'));
const ogLogo = toOg(content.site.og_logo);
for (const p of content.pages) {
  for (const k of ['og', 'twitter']) if (p.seo[k]?.image) p.seo[k].image = toOg(p.seo[k].image);
}
const seoOg = content.pages.map((p) => [p.seo.og.image, p.seo.twitter?.image]);
const rewritten = walk(content);
rewritten.pages.forEach((p, i) => {
  p.seo.og.image = seoOg[i][0];
  if (p.seo.twitter) p.seo.twitter.image = seoOg[i][1];
});
rewritten.site.og_logo = ogLogo;
writeFileSync(contentPath, JSON.stringify(rewritten, null, 2));

// media-manifest.json
const manifestPath = join(root, 'src/data/media-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')).map((m) => {
  const local = toWebp(m.local);
  if (local === m.local) return m;
  const og = toOg(m.local);
  return {
    ...m,
    local,
    ...(existsSync(join(pub, og)) ? { og_jpeg: og } : {}),
    format: 'webp (converted from ' + m.local.split('.').pop() + ')',
    archived_web_version: 'media-originals/site123-web/' + m.local.split('/assets/media/')[1],
  };
});
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// media-dims.json (same pixel size, new extension)
const dimsPath = join(root, 'src/data/media-dims.json');
const dims = JSON.parse(readFileSync(dimsPath, 'utf-8'));
writeFileSync(dimsPath, JSON.stringify(Object.fromEntries(Object.entries(dims).map(([k, v]) => [toWebp(k), v]))));

if (missing.size) {
  console.error('MISSING FILES:', [...missing]);
  process.exit(1);
}
console.log('references updated');
