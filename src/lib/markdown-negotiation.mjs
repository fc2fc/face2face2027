// Markdown content negotiation for AI agents (https://acceptmarkdown.com).
// Shared by the Vercel Routing Middleware (middleware.js) and the build script (scripts/build-markdown.mjs),
// so the URL -> .md mapping is defined in exactly one place. Plain JS so `node --test` can import it directly.

export const SITE_URL = 'https://www.fc2fc.co.il';
export const MARKDOWN_TYPE = 'text/markdown; charset=utf-8';

/**
 * Parse an Accept header into [{ type, q, specificity, order }].
 * Invalid entries are ignored; q defaults to 1 and is clamped to [0, 1].
 */
export function parseAccept(header) {
  if (!header || typeof header !== 'string') return [];
  return header
    .split(',')
    .map((part, order) => {
      const [rawType, ...params] = part.trim().split(';');
      const type = rawType.trim().toLowerCase();
      if (!/^[\w.+*-]+\/[\w.+*-]+$/.test(type)) return null;
      let q = 1;
      for (const p of params) {
        const [k, v] = p.split('=').map((s) => s && s.trim());
        if (k && k.toLowerCase() === 'q') {
          const n = Number(v);
          q = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
        }
      }
      const specificity = type === '*/*' ? 0 : type.endsWith('/*') ? 1 : 2;
      return { type, q, specificity, order };
    })
    .filter(Boolean);
}

/** The q-value the client gives a concrete media type (most specific matching range wins, RFC 9110 §12.5.1). */
function qualityFor(entries, mediaType) {
  const [major] = mediaType.split('/');
  const match = entries
    .filter((e) => e.type === mediaType || e.type === `${major}/*` || e.type === '*/*')
    .sort((a, b) => b.specificity - a.specificity)[0];
  return match ? match.q : 0;
}

/**
 * True when the client explicitly asks for Markdown and prefers it over HTML.
 * Browsers send "text/html,...,*\/*;q=0.8" and never list text/markdown, so they always get HTML.
 * A tie (e.g. "text/markdown, text/html") goes to Markdown, since naming it at all is a deliberate choice.
 */
export function prefersMarkdown(acceptHeader) {
  const entries = parseAccept(acceptHeader);
  const explicit = entries.some((e) => (e.type === 'text/markdown' || e.type === 'text/x-markdown') && e.q > 0);
  if (!explicit) return false;
  const md = Math.max(qualityFor(entries, 'text/markdown'), qualityFor(entries, 'text/x-markdown'));
  const html = qualityFor(entries, 'text/html');
  return md > 0 && md >= html;
}

/**
 * Map a page URL path to the static Markdown twin produced at build time, following the llms.txt
 * convention (https://llmstxt.org): "/" -> "/index.html.md", "/services" -> "/services.md".
 * Returns null for paths that are not pages (files with an extension, internal folders).
 */
export function markdownPathFor(pathname) {
  let path;
  try {
    path = decodeURIComponent(pathname || '/');
  } catch {
    return null;
  }
  // Only plain site paths. "//host/x" or "/\host/x" would make `new URL(path, origin)` point at another host
  // (the middleware fetches the result), so empty segments, backslashes and control characters are rejected.
  if (!path.startsWith('/') || path.includes('..') || /[\\\u0000-\u001f\u007f]/.test(path)) return null;
  if (/\/\/./.test(path)) return null;
  path = path.replace(/\/+$/, '') || '/';
  if (path === '/') return '/index.html.md';
  const last = path.split('/').pop();
  if (last.includes('.')) return null; // a file (/llms.txt, /favicon.ico, /services.md), not a page
  if (/^\/(_astro|_vercel|assets|fonts)(\/|$)/.test(path)) return null;
  return `${path}.md`;
}

/** Markdown body for a 404, so agents get an explanation plus places to go next instead of an HTML shell. */
export function notFoundMarkdown(pathname) {
  let shown = pathname || '/';
  try {
    shown = decodeURIComponent(shown);
  } catch {
    /* keep the raw path */
  }
  shown = shown.replace(/[`\r\n]/g, '');
  return [
    '# 404 – העמוד לא נמצא (Page not found)',
    '',
    `The page \`${shown}\` does not exist on ${SITE_URL}. It may have moved, or the address was mistyped.`,
    '',
    'הקישור ישן או שהכתובת הוקלדה לא נכון.',
    '',
    '## Where to go next',
    '',
    `- [llms.txt – site guide for AI agents](${SITE_URL}/llms.txt)`,
    `- [Home page (Markdown)](${SITE_URL}/index.html.md)`,
    `- [Services – שירותים](${SITE_URL}/services.md)`,
    `- [Portfolio – עבודות](${SITE_URL}/work.md)`,
    `- [Contact – צרו קשר](${SITE_URL}/contact.md)`,
    `- [Sitemap](${SITE_URL}/sitemap-index.xml)`,
    '',
  ].join('\n');
}
