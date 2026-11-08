// Security headers in vercel.json. The CSP starts in Report-Only mode: violations are reported to Sentry
// (nothing is blocked) until the reports show it is safe to enforce.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf-8'));
const global = Object.fromEntries(vercel.headers.find((h) => h.source === '/(.*)').headers.map((h) => [h.key, h.value]));
const csp = Object.fromEntries(
  global['Content-Security-Policy-Report-Only'].split(';').map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]),
);

test('baseline security headers are on every response', () => {
  assert.match(global['Strict-Transport-Security'], /max-age=\d{8,}; includeSubDomains/);
  assert.equal(global['X-Content-Type-Options'], 'nosniff');
  assert.equal(global['X-Frame-Options'], 'DENY');
  assert.equal(global['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.match(global['Permissions-Policy'], /camera=\(\)/);
});

test('CSP (report-only) locks down the dangerous directives', () => {
  assert.deepEqual(csp['default-src'], ["'self'"]);
  assert.deepEqual(csp['object-src'], ["'none'"]);
  assert.deepEqual(csp['base-uri'], ["'self'"]);
  assert.deepEqual(csp['frame-ancestors'], ["'none'"]);
  assert.deepEqual(csp['form-action'], ["'self'", 'https://api.web3forms.com']);
  assert.ok(!csp['script-src'].includes("'unsafe-eval'"));
  assert.ok(!csp['script-src'].includes('*') && !csp['script-src'].includes('https:'), 'no wildcard script hosts');
  assert.match(csp['report-uri'][0], /^https:\/\/o\d+\.ingest\.us\.sentry\.io\/api\/\d+\/security\/\?sentry_key=[0-9a-f]{32}/);
});

// Every third-party origin the site's code loads must be allowed, or enforcing the CSP later would break it.
const allowed = (directive, origin) =>
  csp[directive].some((s) => s === origin || (s.startsWith('https://*.') && origin.endsWith(s.slice('https://*'.length))));

test('every third-party origin used in the source is allowed by the CSP', () => {
  const src = ['src/layouts/Base.astro', ...readdirSync(new URL('../src/components/', import.meta.url)).map((f) => `src/components/${f}`)]
    .map((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf-8'))
    .join('\n');
  const uses = {
    'script-src': ['https://js.sentry-cdn.com', 'https://www.googletagmanager.com', 'https://connect.facebook.net', 'https://js.hcaptcha.com'],
    'connect-src': ['https://api.web3forms.com'],
    'frame-src': ['https://www.youtube-nocookie.com'],
    'form-action': ['https://api.web3forms.com'],
  };
  for (const [directive, origins] of Object.entries(uses)) {
    for (const origin of origins) {
      assert.ok(src.includes(origin), `${origin} is still used in the source (update this test if not)`);
      assert.ok(allowed(directive, origin), `${directive} allows ${origin}`);
    }
  }
  // Script/frame hosts in the source that the CSP does not know about.
  const loaded = new Set([...src.matchAll(/(?:\.src\s*=\s*[`'"]|add\(\s*'|src=\{?[`'"])(https:\/\/[a-z0-9.-]+)/gi)].map((m) => m[1]));
  for (const origin of loaded) {
    assert.ok(allowed('script-src', origin) || allowed('frame-src', origin) || allowed('img-src', origin), `CSP misses ${origin}`);
  }
});
