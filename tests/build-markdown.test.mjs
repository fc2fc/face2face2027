import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractMain, pageToMarkdown, buildMarkdown, htmlFileFor } from '../scripts/build-markdown.mjs';

const NAV = [
  { label: 'בית', url: '/' },
  { label: 'שירותים', url: '/services' },
];

const HTML = `<!doctype html><html><head><title>x</title><style>.a{}</style></head><body>
<header><a href="/">logo</a></header>
<main id="main">
  <h1>נגה מלסה – צלם ומעצב גרפי</h1>
  <p>צילום תדמית <a href="/services">לשירותים</a> and <a href="#top">top</a>.</p>
  <svg class="icon"><path d="M0"/></svg>
  <script>window.x = 1</script>
  <span aria-hidden="true">decoration</span>
  <form><input name="n"><button>שליחה</button></form>
  <picture><source srcset="/a.avif"><img src="/assets/p.jpg" alt="פורטרט עסקי"></picture>
  <img src="/assets/deco.jpg" alt="">
  <ul><li>צילום סטילס</li><li>וידאו</li></ul>
</main>
<footer>footer text</footer>
</body></html>`;

test('extractMain keeps only the page content', () => {
  const main = extractMain(HTML);
  assert.match(main, /<h1>/);
  assert.doesNotMatch(main, /footer text|logo/);
  assert.equal(extractMain('<body>no main</body>'), '');
});

test('pageToMarkdown produces clean Markdown with absolute links', () => {
  const page = { path: '/about', seo: { title: 'אודות | Face2Face', description: 'תיאור העמוד' } };
  const md = pageToMarkdown(page, HTML, NAV);
  assert.match(md, /^# אודות \| Face2Face\n/);
  assert.match(md, /^> תיאור העמוד$/m);
  assert.match(md, /Canonical HTML: https:\/\/www\.fc2fc\.co\.il\/about/);
  assert.match(md, /^# נגה מלסה – צלם ומעצב גרפי$/m);
  assert.match(md, /\[לשירותים\]\(https:\/\/www\.fc2fc\.co\.il\/services\)/);
  assert.match(md, /!\[פורטרט עסקי\]\(https:\/\/www\.fc2fc\.co\.il\/assets\/p\.jpg\)/);
  assert.match(md, /^- צילום סטילס$/m);
  assert.match(md, /\[שירותים\]\(https:\/\/www\.fc2fc\.co\.il\/services\.md\)/, 'navigation points at Markdown twins');
  assert.match(md, /\(https:\/\/www\.fc2fc\.co\.il\/llms\.txt\)/);
  for (const junk of ['window.x', 'decoration', 'שליחה', 'deco.jpg', '<svg', '.a{}', '(#top)', 'footer text']) {
    assert.ok(!md.includes(junk), `should not contain ${junk}`);
  }
  assert.doesNotMatch(md, /\n{3,}/);
});

test('hidden duplicates are dropped, counters show real numbers, adjacent spans keep a space', () => {
  const html = `<main>
    <ul><li>Logo A</li><li aria-hidden="true"><a href="https://a.example"><img src="/a.webp" alt=""></a></li></ul>
    <ul><li><strong class="counter__val" data-target="4950" data-suffix="+">0</strong><span>עבודות מוצלחות</span></li></ul>
    <h1><span>צילום.</span><span>עיצוב</span><span>נוכחות!</span></h1>
    <div role="tabpanel" hidden><p>hidden panel</p></div>
  </main>`;
  const md = pageToMarkdown({ path: '/', seo: { title: 'Home' } }, html, NAV);
  assert.match(md, /^- Logo A$/m);
  assert.doesNotMatch(md, /^-\s*$/m, 'no empty list items');
  assert.match(md, /^- \*\*4,950\+\*\* עבודות מוצלחות$/m);
  assert.doesNotMatch(md, /\*\*0\*\*/);
  assert.match(md, /^# צילום\. עיצוב נוכחות!$/m);
  assert.doesNotMatch(md, /hidden panel/);
});

test('buildMarkdown writes llms.txt-style twins for every built page', () => {
  const dir = mkdtempSync(join(tmpdir(), 'f2f-md-'));
  const dist = join(dir, 'dist');
  mkdirSync(join(dist, 'work'), { recursive: true });
  const content = {
    site: { navigation: NAV },
    pages: [
      { path: '/', seo: { title: 'Home' } },
      { path: '/services', seo: { title: 'Services' } },
      { path: '/work/item-1', seo: { title: 'Item' } },
      { path: '/missing', seo: { title: 'Not built' } },
    ],
  };
  writeFileSync(join(dir, 'content.json'), JSON.stringify(content));
  for (const p of ['/', '/services', '/work/item-1']) writeFileSync(htmlFileFor(dist, p), HTML);

  const written = buildMarkdown({ distDir: dist, contentFile: join(dir, 'content.json') });
  assert.deepEqual(written, ['/index.html.md', '/services.md', '/work/item-1.md']);
  assert.match(readFileSync(join(dist, 'index.html.md'), 'utf-8'), /^# Home\n/);
  assert.ok(existsSync(join(dist, 'work', 'item-1.md')));
  assert.ok(!existsSync(join(dist, 'missing.md')));
});
