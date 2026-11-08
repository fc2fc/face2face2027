import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { servicePageEntries } from '../src/lib/service-pages.mjs';
import { markdownPathFor } from '../src/lib/markdown-negotiation.mjs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf-8');
const data = JSON.parse(read('../src/data/service-pages.json'));
const content = JSON.parse(read('../src/data/site-content.json'));
const items = content.site.portfolio.flatMap((c) => c.items);
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const built = existsSync(join(DIST, 'services/business-portrait.html'));

test('service pages: unique slugs, paths and metadata that fit a search result', () => {
  const slugs = new Set();
  for (const p of data.pages) {
    assert.ok(!slugs.has(p.slug), `duplicate slug ${p.slug}`);
    slugs.add(p.slug);
    assert.equal(p.path, `/services/${p.slug}`);
    assert.ok(p.title.length >= 25 && p.title.length <= 70, `${p.slug} title length ${p.title.length}`);
    assert.ok(p.description.length >= 90 && p.description.length <= 175, `${p.slug} description length ${p.description.length}`);
    assert.ok(p.h1 && p.lead && p.sections.length >= 2, p.slug);
    assert.ok(p.faq.length >= 3, `${p.slug} needs at least 3 FAQ entries`);
  }
  assert.ok(data.pages.length >= 5);
});

test('service pages: every related page, gallery image and video exists', () => {
  const slugs = new Set(data.pages.map((p) => p.slug));
  const srcs = new Set(items.map((i) => i.src).filter(Boolean));
  const videoIds = new Set(items.filter((i) => i.type === 'video').map((i) => i.youtube_id));
  for (const p of data.pages) {
    for (const r of p.related) assert.ok(slugs.has(r) && r !== p.slug, `${p.slug} -> ${r}`);
    for (const s of p.gallery?.srcs ?? []) assert.ok(srcs.has(s), `${p.slug}: unknown image ${s}`);
    for (const id of p.videos?.ids ?? []) assert.ok(videoIds.has(id), `${p.slug}: unknown video ${id}`);
    assert.ok((p.gallery?.srcs?.length ?? 0) + (p.videos?.ids?.length ?? 0) >= 4, `${p.slug} shows its work`);
  }
});

test('service pages carry no invented prices or turnaround promises', () => {
  const text = JSON.stringify(data.pages);
  assert.doesNotMatch(text, /₪|ש"ח|שקל|\d+\s*(ימי עבודה|שעות עבודה)/);
});

test('service pages become indexable site pages with their own Markdown twin', () => {
  const entries = servicePageEntries(data);
  assert.equal(entries.length, data.pages.length);
  for (const e of entries) {
    assert.equal(e.type, 'service');
    assert.equal(e.seo.robots, 'index, follow');
    assert.equal(markdownPathFor(e.path), `${e.path}.md`);
  }
});

test('llms.txt lists every service page', () => {
  const llms = read('../public/llms.txt');
  for (const p of data.pages) assert.ok(llms.includes(`https://www.fc2fc.co.il${p.path}.md`), p.path);
});

test('built service pages: one h1, canonical, Service schema, sitemap entry, Markdown twin', { skip: !built && 'dist/ not built' }, () => {
  const sitemap = readdirSitemaps();
  for (const p of data.pages) {
    const html = readFileSync(join(DIST, `${p.path.slice(1)}.html`), 'utf-8');
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${p.path} h1 count`);
    assert.ok(html.includes(`<link rel="canonical" href="https://www.fc2fc.co.il${p.path}">`), `${p.path} canonical`);
    assert.doesNotMatch(html, /name="robots" content="[^"]*noindex/, `${p.path} must be indexable`);
    assert.ok(html.includes('"@type":"Service"') && html.includes('"@type":"BreadcrumbList"'), `${p.path} schema`);
    assert.ok(sitemap.includes(`https://www.fc2fc.co.il${p.path}<`), `${p.path} in sitemap`);
    const md = readFileSync(join(DIST, `${p.path.slice(1)}.md`), 'utf-8');
    assert.ok(md.includes(p.h1) && md.length > 500, `${p.path} markdown`);
  }
});

function readdirSitemaps() {
  return ['sitemap-0.xml', 'sitemap.xml']
    .map((f) => (existsSync(join(DIST, f)) ? readFileSync(join(DIST, f), 'utf-8') : ''))
    .join('\n');
}
