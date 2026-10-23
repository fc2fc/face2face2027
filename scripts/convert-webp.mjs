// One-off migration step: convert public/assets/media images to WebP,
// make 1200px JPEG copies for og:image (social previews), and archive the replaced files.
import { readFileSync, readdirSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const media = join(root, 'public/assets/media');
const archive = join(root, 'media-originals/site123-web');
const CONVERT_DIRS = ['uploads', 'youtube', 'brand'];

// og/twitter images and the Schema logo/photo stay JPEG – WebP support in link previews is inconsistent.
const content = JSON.parse(readFileSync(join(root, 'src/data/site-content.json'), 'utf-8'));
const ogSources = new Set(['/assets/media/uploads/6887d8a3748cc.png', '/assets/media/uploads/6883cf3ad224c.jpg']);
for (const p of content.pages) {
  for (const k of ['og', 'twitter']) {
    const v = p.seo[k]?.image;
    if (v?.startsWith('/assets/media/')) ogSources.add(v);
  }
}

mkdirSync(join(media, 'og'), { recursive: true });
let before = 0;
let after = 0;
const jobs = [];
for (const dir of CONVERT_DIRS) {
  mkdirSync(join(archive, dir), { recursive: true });
  for (const file of readdirSync(join(media, dir))) {
    const { name, ext } = parse(file);
    if (!/^\.(png|jpe?g)$/i.test(ext)) continue;
    const src = join(media, dir, file);
    const webPath = `/assets/media/${dir}/${file}`;
    jobs.push(async () => {
      const input = readFileSync(src);
      before += input.length;
      const img = sharp(input, { failOn: 'none' });
      const meta = await img.metadata();
      const out = join(media, dir, `${name}.webp`);
      // Photos (jpg) vs. graphics with text/logos (png): a bit more quality for graphics.
      const info = await img
        .clone()
        .webp({ quality: ext.toLowerCase() === '.png' ? 82 : 80, effort: 5, alphaQuality: 90 })
        .toFile(out);
      after += info.size;
      if (ogSources.has(webPath)) {
        const og = await img
          .clone()
          .resize({ width: 1200, withoutEnlargement: true })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 80, mozjpeg: true })
          .toFile(join(media, 'og', `${name}.jpg`));
        after += og.size;
      }
      renameSync(src, join(archive, dir, file));
      return meta;
    });
  }
}

// Small worker pool
let i = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (i < jobs.length) await jobs[i++]();
  }),
);
console.log(`converted ${jobs.length} images, og copies ${readdirSync(join(media, 'og')).length}`);
console.log(`before ${(before / 1e6).toFixed(1)}MB -> after ${(after / 1e6).toFixed(1)}MB (incl. og jpgs)`);
if (!existsSync(join(media, 'brand/logo.webp'))) throw new Error('logo not converted');
