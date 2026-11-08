// Machine-readable files for AI agents: llms.txt (https://llmstxt.org) and the vercel.json headers that serve them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const llms = readFileSync(new URL('../public/llms.txt', import.meta.url), 'utf-8');
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf-8'));
const content = JSON.parse(readFileSync(new URL('../src/data/site-content.json', import.meta.url), 'utf-8'));
const serviceSlugs = [
  ...JSON.parse(readFileSync(new URL('../src/data/service-pages.json', import.meta.url), 'utf-8')).pages.map((p) => p.path),
  ...(() => {
    const g = JSON.parse(readFileSync(new URL('../src/data/guides.json', import.meta.url), 'utf-8'));
    return [g.index.path, ...g.guides.map((x) => x.path)];
  })(),
];

test('llms.txt follows the llmstxt.org structure', () => {
  const lines = llms.split('\n');
  assert.match(lines[0], /^# \S/, 'starts with a single H1 (the site name)');
  assert.equal(llms.match(/^# /gm).length, 1, 'only one H1');
  assert.match(lines[2], /^> \S/, 'H1 is followed by a blockquote summary');
  // Before the first H2 only free text is allowed (no other headings).
  const intro = llms.slice(0, llms.indexOf('\n## '));
  assert.doesNotMatch(intro.split('\n').slice(1).join('\n'), /^#{1,6} /m);
  // Every H2 section is a file list: "- [name](url)" with optional ": notes".
  const sections = llms.split(/^## .*$/m).slice(1);
  assert.ok(sections.length >= 2);
  for (const s of sections) {
    for (const line of s.split('\n').filter((l) => l.trim())) {
      assert.match(line, /^- \[[^\]]+\]\((https:\/\/www\.fc2fc\.co\.il\/[^)]*|tel:\+\d+|mailto:[^)]+|https:\/\/wa\.me\/\d+)\)(: .+)?$/, line);
    }
  }
  assert.match(llms, /^## Optional$/m);
});

test('llms.txt tells agents when to use Face2Face and how to reach it', () => {
  assert.match(llms, /When to use this/);
  assert.match(llms, /best-fit jobs/);
  assert.match(llms, /How an agent should contact us/);
  assert.match(llms, /Accept: text\/markdown/);
  assert.match(llms, /\(tel:\+972528133633\)/);
  assert.match(llms, new RegExp(`\\(${content.site.contact.whatsapp.replace(/[./]/g, '\\$&')}\\)`));
  assert.match(llms, new RegExp(content.site.contact.email.replace(/[.]/g, '\\.')));
});

test('every page linked from llms.txt is a real page with a Markdown twin', () => {
  const paths = new Set([...content.pages.map((p) => p.path), ...serviceSlugs]);
  const md = [...llms.matchAll(/\(https:\/\/www\.fc2fc\.co\.il(\/[^)]*)\.md\)/g)].map((m) => m[1]);
  assert.ok(md.length >= 6);
  for (const p of md) assert.ok(paths.has(p === '/index.html' ? '/' : p), p);
});

const headerFor = (source, key) =>
  vercel.headers.find((h) => h.source === source)?.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;

test('vercel.json serves Vary: Accept on pages and correct types for agent files', () => {
  assert.equal(headerFor('/((?!_astro/|_vercel/|assets/|fonts/|.*\\.).*)', 'Vary'), 'Accept');
  assert.equal(headerFor('/(.*)\\.md', 'Content-Type'), 'text/markdown; charset=utf-8');
  assert.equal(headerFor('/(.*)\\.md', 'X-Robots-Tag'), 'noindex', 'Markdown twins must not compete with the HTML in Google');
  assert.equal(headerFor('/llms.txt', 'Content-Type'), 'text/plain; charset=utf-8');
});

test('Markdown generation runs after every build', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  assert.match(pkg.scripts.postbuild, /build-markdown\.mjs/);
  assert.ok(existsSync(new URL('../middleware.js', import.meta.url)));
});
