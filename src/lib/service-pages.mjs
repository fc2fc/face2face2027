// Dedicated service pages (src/data/service-pages.json) turned into the same page objects the rest of the site uses
// (site-content.json "pages"). Pure function, no file access, so Astro (content.ts) and the Markdown build script share it.
export const SERVICE_OG_IMAGE = '/assets/media/og/f2f-share-v5.jpg';

export function servicePageEntries(data) {
  return data.pages.map((sp) => ({
    path: sp.path,
    old_path: sp.path,
    type: 'service',
    seo: {
      title: sp.title,
      description: sp.description,
      robots: 'index, follow',
      og: { title: sp.title, description: sp.description, image: SERVICE_OG_IMAGE, image_alt: 'Face2Face – נגה מלסה: צילום, וידאו ועיצוב גרפי' },
      twitter: { card: 'summary_large_image' },
    },
    headings: { h1: [sp.h1] },
    sections: [],
    service: sp,
  }));
}
