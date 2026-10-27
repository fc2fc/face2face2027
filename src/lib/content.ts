import content from '../data/site-content.json';
import dims from '../data/media-dims.json';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

export const site = content.site as any;
export const pages = content.pages as any[];
export const SITE_URL = 'https://www.fc2fc.co.il';

export function pageByPath(path: string) {
  return pages.find((p) => p.old_path === path);
}

export function size(src?: string): { width?: number; height?: number } {
  const d = src ? (dims as Record<string, { w: number; h: number }>)[src] : undefined;
  return d ? { width: d.w, height: d.h } : {};
}

/** Real pixel size of an image under /public (e.g. an og:image), read at build time and cached. */
const publicSizes = new Map<string, Promise<{ width: number; height: number } | undefined>>();
export function publicImageSize(path?: string | null) {
  if (!path || path.startsWith('http')) return Promise.resolve(undefined);
  if (!publicSizes.has(path)) {
    publicSizes.set(
      path,
      (async () => {
        const { default: sharp } = await import('sharp');
        const { join } = await import('node:path');
        try {
          const m = await sharp(join(process.cwd(), 'public', decodeURI(path))).metadata();
          return m.width && m.height ? { width: m.width, height: m.height } : undefined;
        } catch {
          return undefined;
        }
      })(),
    );
  }
  return publicSizes.get(path)!;
}

export function absolute(url?: string | null) {
  if (!url) return undefined;
  return url.startsWith('http') ? url : SITE_URL + encodeURI(url);
}

/** Site123 split sentences across <div>s; rejoin lines that don't end a sentence. */
export function toParagraphs(lines: string[]): string[] {
  const out: string[] = [];
  let buf = '';
  for (const line of lines) {
    buf = buf ? `${buf} ${line}` : line;
    if (/[.!?:]$/.test(line) || /^שלום,?$/.test(line)) {
      out.push(buf.replace(/\s+([,.])/g, '$1'));
      buf = '';
    }
  }
  if (buf) out.push(buf);
  return out;
}

export function youtubeIdFromThumb(src: string) {
  const m = src.match(/\/youtube\/([\w-]{11})\.webp$/);
  return m ? m[1] : null;
}

// Site123 left the client-logo alt texts empty; name them by their link for accessibility and SEO.
const CLIENT_NAMES: Record<string, string> = {
  'wzo.org.il': 'ההסתדרות הציונית העולמית',
  'thejoint.org.il': "ג'וינט ישראל",
  'nbn.org.il': 'נפש בנפש',
  'mishpahot-hantzaha.mod.gov.il': 'משרד הביטחון – משפחות והנצחה',
  ministry_of_science_and_technology: 'משרד החדשנות, המדע והטכנולוגיה',
  ministry_of_health: 'משרד הבריאות',
  'ministry-of-education': 'משרד החינוך',
  ministry_of_foreign_affairs: 'משרד החוץ',
  ministry_of_finance: 'משרד האוצר',
  ministry_of_economy: 'משרד הכלכלה והתעשייה',
  ministry_of_transport_and_road_safety: 'משרד התחבורה והבטיחות בדרכים',
  'kachollavan.org.il': 'כחול לבן',
  'government-press-office': 'לשכת העיתונות הממשלתית',
  'mt-law.co.il': 'MT משרד עורכי דין',
  'jewsofethiopia.com': 'יהודי אתיופיה',
  'tefflee.co.il': 'Tefflee',
};

export function clientName(link?: string | null) {
  if (!link) return 'לקוח';
  const key = Object.keys(CLIENT_NAMES).find((k) => link.includes(k));
  return key ? CLIENT_NAMES[key] : 'לקוח';
}

// Images live in src/assets/media so astro:assets can resize them; site-content.json keeps the
// '/assets/media/...' paths, which map 1:1 onto these imports.
const mediaFiles = import.meta.glob<{ default: ImageMetadata }>('/src/assets/media/**/*.{webp,jpg,jpeg,png}', {
  eager: true,
});

/** Imported image for a '/assets/media/...' path from site-content.json. Throws on unknown paths so a typo fails the build. */
export function asset(src: string): ImageMetadata {
  const file = mediaFiles[`/src${src}`];
  if (!file) throw new Error(`Image not found in src/assets: ${src}`);
  return file.default;
}

/** URL of a resized WebP (for the lightbox, video poster and other non-<img> uses). */
export async function imageUrl(src: string, width: number) {
  const img = await getImage({ src: asset(src), width, format: 'webp' });
  return img.src;
}
