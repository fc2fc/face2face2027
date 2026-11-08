import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAccept, prefersMarkdown, markdownPathFor, notFoundMarkdown } from '../src/lib/markdown-negotiation.mjs';

const BROWSER_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';

test('parseAccept reads types and q-values', () => {
  assert.deepEqual(
    parseAccept('text/markdown;q=0.9, text/html').map(({ type, q }) => ({ type, q })),
    [
      { type: 'text/markdown', q: 0.9 },
      { type: 'text/html', q: 1 },
    ],
  );
  assert.deepEqual(parseAccept(''), []);
  assert.deepEqual(parseAccept(undefined), []);
  assert.deepEqual(parseAccept('garbage'), []);
});

test('agents that ask for Markdown get Markdown', () => {
  assert.equal(prefersMarkdown('text/markdown'), true);
  assert.equal(prefersMarkdown('text/markdown, text/html;q=0.5'), true);
  assert.equal(prefersMarkdown('text/markdown, text/html'), true, 'tie goes to the explicitly named Markdown');
  assert.equal(prefersMarkdown('text/x-markdown'), true);
  assert.equal(prefersMarkdown('TEXT/MARKDOWN; charset=utf-8'), true);
  assert.equal(prefersMarkdown('text/markdown, */*;q=0.1'), true);
});

test('browsers, crawlers and HTML-preferring clients keep getting HTML', () => {
  assert.equal(prefersMarkdown(BROWSER_ACCEPT), false);
  assert.equal(prefersMarkdown('text/html'), false);
  assert.equal(prefersMarkdown('*/*'), false);
  assert.equal(prefersMarkdown(''), false);
  assert.equal(prefersMarkdown(null), false);
  assert.equal(prefersMarkdown('text/html, text/markdown;q=0.5'), false);
  assert.equal(prefersMarkdown('text/markdown;q=0'), false);
});

test('page paths map to their llms.txt-style Markdown twins', () => {
  assert.equal(markdownPathFor('/'), '/index.html.md');
  assert.equal(markdownPathFor(''), '/index.html.md');
  assert.equal(markdownPathFor('/services'), '/services.md');
  assert.equal(markdownPathFor('/services/'), '/services.md');
  assert.equal(markdownPathFor('/work/item-id-688b84bb373b6'), '/work/item-id-688b84bb373b6.md');
  assert.equal(markdownPathFor('/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D'), '/שירותים.md');
});

test('files, internal folders and unsafe paths have no Markdown twin', () => {
  for (const p of ['/llms.txt', '/favicon.ico', '/services.md', '/index.html.md', '/_astro/x', '/assets/a', '/fonts/f', '/_vercel/i']) {
    assert.equal(markdownPathFor(p), null, p);
  }
  assert.equal(markdownPathFor('/a/../etc'), null);
  assert.equal(markdownPathFor('/%E0%A4%A'), null, 'malformed percent-encoding');
});

test('the Markdown 404 body explains the error and links to llms.txt and the sitemap', () => {
  const md = notFoundMarkdown('/__probe-404');
  assert.ok(md.length >= 20);
  assert.match(md, /^# 404/);
  assert.match(md, /`\/__probe-404`/);
  assert.match(md, /\(https:\/\/www\.fc2fc\.co\.il\/llms\.txt\)/);
  assert.match(md, /\(https:\/\/www\.fc2fc\.co\.il\/sitemap-index\.xml\)/);
  assert.doesNotMatch(notFoundMarkdown('/a`b\nc'), /a`b/, 'path cannot break out of the code span');
});

test('paths that could escape to another host are rejected', () => {
  for (const p of ['//evil.example/x', '/%2F%2Fevil.example/x', '/\\evil.example/x', '/%5Cevil.example/x', '/a//b', '/a%00b', '/a%0Ab']) {
    assert.equal(markdownPathFor(p), null, p);
  }
  assert.equal(markdownPathFor('/services/'), '/services.md', 'a single trailing slash is still fine');
});
