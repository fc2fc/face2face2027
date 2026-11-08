// Checks the real build output. Run after `npm run build` (skipped when dist/ has not been built).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { markdownPathFor } from '../src/lib/markdown-negotiation.mjs';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const built = existsSync(join(DIST, 'index.html.md'));
const content = JSON.parse(readFileSync(new URL('../src/data/site-content.json', import.meta.url), 'utf-8'));

test('every page has a non-empty Markdown twin in dist/', { skip: !built && 'dist/ not built' }, () => {
  for (const page of content.pages) {
    const file = join(DIST, decodeURI(markdownPathFor(page.path)).slice(1));
    assert.ok(existsSync(file), file);
    const md = readFileSync(file, 'utf-8');
    assert.match(md, /^# \S/, file);
    assert.ok(md.length > 200, file);
  }
});

test('homepage Markdown carries the real homepage content', { skip: !built && 'dist/ not built' }, () => {
  const md = readFileSync(join(DIST, 'index.html.md'), 'utf-8');
  assert.ok(md.length >= 500);
  for (const text of ['נגה מלסה', 'צילום סטילס', 'צילום וידאו', 'עיצוב גרפי', '4,950', '+972-52-813-3633']) {
    assert.ok(md.includes(text), text);
  }
  assert.doesNotMatch(md, /<(script|style|svg)\b/i);
  assert.doesNotMatch(md, /\*\*0\*\*/, 'animated counters show their real value');
});

test('HTML pages advertise their Markdown twin; llms.txt is published', { skip: !built && 'dist/ not built' }, () => {
  const home = readFileSync(join(DIST, 'index.html'), 'utf-8');
  assert.match(home, /<link rel="alternate" type="text\/markdown" href="https:\/\/www\.fc2fc\.co\.il\/index\.html\.md">/);
  assert.doesNotMatch(readFileSync(join(DIST, '404.html'), 'utf-8'), /type="text\/markdown"/);
  assert.ok(existsSync(join(DIST, 'llms.txt')));
});
