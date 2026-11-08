// Vercel Routing Middleware: Markdown content negotiation for AI agents (https://acceptmarkdown.com).
//
// Browsers and crawlers that want HTML are untouched: the request continues to the static page.
// A request that prefers `Accept: text/markdown` gets the page's Markdown twin, which
// scripts/build-markdown.mjs writes next to every HTML page at build time ("/" -> /index.html.md,
// "/services" -> /services.md). Unknown paths get a Markdown 404 body with status 404.
// `Vary: Accept` is set on these responses here and on the HTML responses in vercel.json, so caches keep the two apart.
import { next } from '@vercel/functions';
import { markdownPathFor, notFoundMarkdown, prefersMarkdown, MARKDOWN_TYPE } from './src/lib/markdown-negotiation.mjs';

export const config = {
  // Pages only: skip build assets, media, fonts and any path with a file extension (.md, .txt, .xml, images…).
  matcher: ['/((?!_astro/|_vercel/|assets/|fonts/|.*\\.).*)'],
};

const APEX_HOST = 'fc2fc.co.il';

const isMarkdown = (contentType) => /^text\/markdown\b/i.test(contentType || '');

function markdownResponse(body, status, method) {
  return new Response(method === 'HEAD' ? null : body, {
    status,
    headers: {
      'Content-Type': MARKDOWN_TYPE,
      Vary: 'Accept',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
}

export default async function middleware(request, { fetchImpl = fetch } = {}) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return next();
  if (!prefersMarkdown(request.headers.get('accept'))) return next();

  const url = new URL(request.url);
  // Let vercel.json's 308 redirect to www happen first, so agents end up on the canonical host.
  if (url.hostname === APEX_HOST) return next();

  const mdPath = markdownPathFor(url.pathname);
  if (!mdPath) return next();
  // Defence in depth: sub-requests (which may carry the visitor's cookies) only ever go to this same origin.
  const mdUrl = new URL(encodeURI(mdPath), url.origin);
  if (mdUrl.origin !== url.origin) return next();

  // Sub-requests go back to this same deployment. Pass the visitor's cookies along so they work behind
  // Vercel deployment protection (previews), and never follow redirects: a login page or any other
  // non-Markdown answer must not be served as if it were the page's content.
  const cookie = request.headers.get('cookie');
  const subHeaders = (accept) => (cookie ? { accept, cookie } : { accept });

  const md = await fetchImpl(mdUrl, { redirect: 'manual', headers: subHeaders('text/markdown') });
  if (md.status === 200 && isMarkdown(md.headers.get('content-type'))) {
    return markdownResponse(await md.text(), 200, request.method);
  }

  // No Markdown twin: either an old URL that vercel.json redirects, or a page that does not exist.
  // Ask for the HTML version (which skips this branch) without following redirects to tell them apart.
  const probe = await fetchImpl(url, { method: 'HEAD', redirect: 'manual', headers: subHeaders('text/html') });
  if (probe.status >= 300 && probe.status < 400 && probe.headers.get('location')) {
    return new Response(null, {
      status: probe.status,
      headers: { Location: probe.headers.get('location'), Vary: 'Accept' },
    });
  }
  if (probe.status === 404) return markdownResponse(notFoundMarkdown(url.pathname), 404, request.method);
  return next();
}
