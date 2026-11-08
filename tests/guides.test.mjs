import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { guideEntries } from '../src/lib/guides.mjs';
import { markdownPathFor } from '../src/lib/markdown-negotiation.mjs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf-8');
const data = JSON.parse(read('../src/data/guides.json'));
const services = JSON.parse(read('../src/data/service-pages.json'));
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const built = existsSync(join(DIST, 'guides/business-portrait-preparation.html'));

test('guides: unique slugs, paths and metadata that fit a search result', () => {
  const slugs = new Set();
  for (const g of data.guides) {
    assert.ok(!slugs.has(g.slug), `duplicate slug ${g.slug}`);
    slugs.add(g.slug);
    assert.equal(g.path, `/guides/${g.slug}`);
    assert.ok(g.title.length >= 25 && g.title.length <= 70, `${g.slug} title length ${g.title.length}`);
    assert.ok(g.description.length >= 90 && g.description.length <= 175, `${g.slug} description length ${g.description.length}`);
    assert.ok(g.h1 && g.lead && g.sections.length >= 3 && g.faq.length >= 2, g.slug);
    assert.match(g.published, /^\d{4}-\d{2}-\d{2}$/);
  }
  assert.ok(data.guides.length >= 3);
});

test('guides: related guides and the service page they point to exist', () => {
  const slugs = new Set(data.guides.map((g) => g.slug));
  const serviceSlugs = new Set(services.pages.map((p) => p.slug));
  for (const g of data.guides) {
    assert.ok(serviceSlugs.has(g.service), `${g.slug} -> service ${g.service}`);
    for (const r of g.related) assert.ok(slugs.has(r) && r !== g.slug, `${g.slug} -> ${r}`);
  }
});

test('guides carry no invented prices or turnaround promises', () => {
  assert.doesNotMatch(JSON.stringify(data), /₪|ש"ח|שקל|\d+\s*(ימי עבודה|שעות עבודה|דקות|ימים)/);
});

test('guides become indexable site pages with their own Markdown twin', () => {
  const entries = guideEntries(data);
  assert.equal(entries.length, data.guides.length + 1);
  for (const e of entries) {
    assert.equal(e.seo.robots, 'index, follow');
    assert.equal(markdownPathFor(e.path), `${e.path}.md`);
  }
});

test('llms.txt lists the guides index and every guide', () => {
  const llms = read('../public/llms.txt');
  for (const path of [data.index.path, ...data.guides.map((g) => g.path)]) {
    assert.ok(llms.includes(`https://www.fc2fc.co.il${path}.md`), path);
  }
});

test('built guide pages: one h1, canonical, Article schema, sitemap entry, Markdown twin', { skip: !built && 'dist/ not built' }, () => {
  const sitemap = ['sitemap-0.xml', 'sitemap.xml'].map((f) => (existsSync(join(DIST, f)) ? read(`../dist/${f}`) : '')).join('\n');
  for (const g of data.guides) {
    const html = read(`../dist/${g.path.slice(1)}.html`);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${g.path} h1 count`);
    assert.ok(html.includes(`<link rel="canonical" href="https://www.fc2fc.co.il${g.path}">`), `${g.path} canonical`);
    assert.ok(html.includes('"@type":"Article"') && html.includes('"@type":"BreadcrumbList"'), `${g.path} schema`);
    assert.ok(sitemap.includes(`https://www.fc2fc.co.il${g.path}<`), `${g.path} in sitemap`);
    assert.ok(read(`../dist/${g.path.slice(1)}.md`).includes(g.h1), `${g.path} markdown`);
  }
  assert.ok(sitemap.includes('https://www.fc2fc.co.il/guides<'), 'index in sitemap');
});
