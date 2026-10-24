import content from '../data/site-content.json';
import dims from '../data/media-dims.json';
import fs from 'node:fs';
import nodePath from 'node:path';

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

/** 640px WebP thumbnail for a gallery image (generated into /assets/media/thumbs); falls back to the original. */
export function thumb(src?: string): string | undefined {
  if (!src) return src;
  const name = nodePath.basename(src, nodePath.extname(src));
  const rel = `/assets/media/thumbs/${name}.webp`;
  return fs.existsSync(nodePath.join(process.cwd(), 'public', rel)) ? rel : src;
}
