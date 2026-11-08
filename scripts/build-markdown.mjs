// Post-build: write a Markdown twin of every page into dist/, following the llms.txt convention
// (https://llmstxt.org): "/" -> /index.html.md, "/services" -> /services.md.
// middleware.js serves these to clients that send `Accept: text/markdown`; agents can also fetch them directly.
//
// The Markdown is converted from the page's built <main> element, so it always matches what visitors see,
// minus chrome that means nothing outside a browser (scripts, styles, icons, forms, videos).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import TurndownService from 'turndown';
import { markdownPathFor, SITE_URL } from '../src/lib/markdown-negotiation.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function htmlFileFor(distDir, path) {
  return join(distDir, path === '/' ? 'index.html' : `${decodeURI(path).slice(1)}.html`);
}

/**
 * Inner HTML of the page's <main> element (the layout wraps every page's content in <main id="main">).
 * Adjacent inline elements that the CSS lays out as separate blocks ("<strong>16+</strong><span>שנות ניסיון</span>")
 * get a space between them, so their words don't run together in plain text.
 */
export function extractMain(html) {
  const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1].replace(/(<\/(?:span|strong|b|em|i|a|small)>)(?=<)/gi, '$1 ') : '';
}

function absolutize(url) {
  if (!url || /^(https?:|mailto:|tel:|#|data:)/i.test(url)) return url;
  try {
    return new URL(url, SITE_URL + '/').href;
  } catch {
    return url;
  }
}

export function createConverter() {
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '*' });
  td.remove(['script', 'style', 'noscript', 'template', 'svg', 'form', 'button', 'video', 'audio', 'iframe', 'source', 'dialog']);
  // Elements hidden from everyone (aria-hidden decoration, duplicated marquee logos, [hidden]) stay out too.
  // addRule (not remove) so it wins over Turndown's built-in list/heading rules.
  td.addRule('hidden', {
    filter: (node) => node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden'),
    replacement: () => '',
  });
  // Animated counters start at "0" in the HTML and count up with JavaScript; give agents the real number.
  td.addRule('counters', {
    filter: (node) => /^\d+$/.test(node.getAttribute('data-target') || ''),
    replacement: (_content, node) =>
      `**${Number(node.getAttribute('data-target')).toLocaleString('en-US')}${node.getAttribute('data-suffix') || ''}**`,
  });
  td.addRule('absoluteLinks', {
    filter: (node) => node.nodeName === 'A' && node.getAttribute('href'),
    replacement: (content, node) => {
      const text = content.replace(/\s+/g, ' ').trim();
      const href = absolutize(node.getAttribute('href'));
      if (!text) return '';
      return href.startsWith('#') ? text : `[${text}](${href})`;
    },
  });
  td.addRule('images', {
    filter: 'img',
    replacement: (_content, node) => {
      const alt = (node.getAttribute('alt') || '').replace(/[\[\]\n]/g, ' ').trim();
      const src = absolutize(node.getAttribute('src'));
      return alt && src ? `![${alt}](${src})` : '';
    },
  });
  return td;
}

function tidy(md) {
  return md
    .replace(/^(\s*)([-*]|\d+\.) {2,}/gm, '$1$2 ') // "-   item" -> "- item"
    .replace(/^ (?=\S)/gm, '') // stray single space left where inline whitespace started a line
    .replace(/^[ \t]*[-*][ \t]*$/gm, '') // list items left empty (their content was decorative)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function pageToMarkdown(page, html, nav, converter = createConverter()) {
  const canonical = SITE_URL + (page.path === '/' ? '/' : encodeURI(page.path));
  const title = page.seo?.title || 'Face2Face';
  const body = tidy(converter.turndown(extractMain(html)));
  const links = nav.map((n) => `- [${n.label}](${SITE_URL}${markdownPathFor(n.url)})`).join('\n');
  return [
    `# ${title}`,
    '',
    page.seo?.description ? `> ${page.seo.description}\n` : null,
    `Canonical HTML: ${canonical}`,
    '',
    '---',
    '',
    body,
    '',
    '---',
    '',
    '## ניווט באתר (Site navigation)',
    '',
    links,
    `- [llms.txt – מדריך לסוכני AI](${SITE_URL}/llms.txt)`,
    '',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function buildMarkdown({ distDir = join(ROOT, 'dist'), contentFile = join(ROOT, 'src/data/site-content.json') } = {}) {
  const content = JSON.parse(readFileSync(contentFile, 'utf-8'));
  const nav = content.site.navigation;
  const converter = createConverter();
  const written = [];
  for (const page of content.pages) {
    const htmlFile = htmlFileFor(distDir, page.path);
    const mdPath = markdownPathFor(page.path);
    if (!mdPath || !existsSync(htmlFile)) continue;
    const out = join(distDir, decodeURI(mdPath).slice(1));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, pageToMarkdown(page, readFileSync(htmlFile, 'utf-8'), nav, converter));
    written.push(mdPath);
  }
  return written;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const written = buildMarkdown();
  console.log(`[build-markdown] wrote ${written.length} Markdown pages`);
  if (!written.includes('/index.html.md')) {
    console.error('[build-markdown] homepage Markdown missing – dist/index.html not found?');
    process.exit(1);
  }
}
