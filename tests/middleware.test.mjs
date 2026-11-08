import { test } from 'node:test';
import assert from 'node:assert/strict';
import middleware, { config } from '../middleware.js';

const HOME_MD = '# נגה מלסה | צילום, וידאו ועיצוב גרפי – Face2Face\n\ncontent';

/** Fake origin: serves the Markdown twins in `files`, answers HEAD probes with `probe` (status / location). */
function fakeFetch({ files = { '/index.html.md': HOME_MD }, probe = { status: 404 } } = {}) {
  const calls = [];
  const impl = async (input, init = {}) => {
    const url = new URL(input);
    calls.push({ url: url.href, init });
    if (init.method === 'HEAD') {
      return new Response(null, { status: probe.status, headers: probe.location ? { location: probe.location } : {} });
    }
    const body = files[decodeURIComponent(url.pathname)];
    return body === undefined ? new Response('Not found', { status: 404 }) : new Response(body, { status: 200 });
  };
  impl.calls = calls;
  return impl;
}

const req = (path, accept, { method = 'GET', host = 'www.fc2fc.co.il' } = {}) =>
  new Request(`https://${host}${path}`, { method, headers: accept ? { accept } : {} });

const isPassThrough = (res) => res.headers.get('x-middleware-next') === '1';

test('HTML requests pass straight through without extra fetches', async () => {
  const fetchImpl = fakeFetch();
  for (const accept of ['text/html,application/xhtml+xml,*/*;q=0.8', '*/*', undefined]) {
    const res = await middleware(req('/', accept), { fetchImpl });
    assert.ok(isPassThrough(res), String(accept));
  }
  assert.equal(fetchImpl.calls.length, 0);
});

test('Accept: text/markdown on the homepage returns the Markdown twin with Vary: Accept', async () => {
  const fetchImpl = fakeFetch();
  const res = await middleware(req('/', 'text/markdown'), { fetchImpl });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(res.headers.get('vary'), 'Accept');
  assert.equal(res.headers.get('x-robots-tag'), 'noindex');
  assert.equal(await res.text(), HOME_MD);
  assert.equal(fetchImpl.calls[0].url, 'https://www.fc2fc.co.il/index.html.md');
});

test('inner pages map to their own twin', async () => {
  const fetchImpl = fakeFetch({ files: { '/services.md': '# Services' } });
  const res = await middleware(req('/services', 'text/markdown, text/html;q=0.5'), { fetchImpl });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), '# Services');
});

test('unknown paths get a Markdown 404 body with status 404', async () => {
  const fetchImpl = fakeFetch({ probe: { status: 404 } });
  const res = await middleware(req('/__ora-404-probe-n8gszl9m', 'text/markdown'), { fetchImpl });
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(res.headers.get('vary'), 'Accept');
  const body = await res.text();
  assert.ok(body.length >= 20);
  assert.match(body, /llms\.txt/);
  // The probe asks for HTML (so it does not re-enter this branch) and does not follow redirects.
  const probe = fetchImpl.calls.find((c) => c.init.method === 'HEAD');
  assert.equal(probe.init.redirect, 'manual');
  assert.equal(probe.init.headers.accept, 'text/html');
});

test('old Site123 URLs keep their redirect for Markdown clients', async () => {
  const fetchImpl = fakeFetch({ probe: { status: 308, location: '/services' } });
  const res = await middleware(req('/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D', 'text/markdown'), { fetchImpl });
  assert.equal(res.status, 308);
  assert.equal(res.headers.get('location'), '/services');
});

test('a page that exists but has no twin falls back to HTML', async () => {
  const fetchImpl = fakeFetch({ files: {}, probe: { status: 200 } });
  assert.ok(isPassThrough(await middleware(req('/404', 'text/markdown'), { fetchImpl })));
});

test('HEAD gets Markdown headers without a body', async () => {
  const res = await middleware(req('/', 'text/markdown', { method: 'HEAD' }), { fetchImpl: fakeFetch() });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(await res.text(), '');
});

test('the apex host is left to the canonical www redirect; non-GET methods are untouched', async () => {
  const fetchImpl = fakeFetch();
  assert.ok(isPassThrough(await middleware(req('/', 'text/markdown', { host: 'fc2fc.co.il' }), { fetchImpl })));
  assert.ok(isPassThrough(await middleware(req('/', 'text/markdown', { method: 'POST' }), { fetchImpl })));
  assert.equal(fetchImpl.calls.length, 0);
});

test('the matcher covers pages only, never files or build assets', () => {
  // Vercel compiles matcher strings with path-to-regexp; a "(regex)" group after "/" behaves like this:
  const [source] = config.matcher;
  const re = new RegExp('^' + source.replace(/^\/\(/, '/(') + '$');
  for (const p of ['/', '/services', '/work/item-id-1', '/__ora-404-probe-n8gszl9m']) assert.ok(re.test(p), p);
  for (const p of ['/llms.txt', '/index.html.md', '/_astro/a.css', '/assets/x', '/fonts/a', '/_vercel/insights/script.js', '/favicon.ico'])
    assert.ok(!re.test(p), p);
});
