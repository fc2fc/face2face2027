// Guides (src/data/guides.json) turned into the same page objects the rest of the site uses.
// Pure function, shared by Astro (content.ts) and the Markdown build script.
export const GUIDE_OG_IMAGE = '/assets/media/og/f2f-share-v5.jpg';

function seoFor(item) {
  return {
    title: item.title,
    description: item.description,
    robots: 'index, follow',
    og: { title: item.title, description: item.description, image: GUIDE_OG_IMAGE, image_alt: 'Face2Face – נגה מלסה: צילום, וידאו ועיצוב גרפי' },
    twitter: { card: 'summary_large_image' },
  };
}

export function guideEntries(data) {
  const index = {
    path: data.index.path,
    old_path: data.index.path,
    type: 'guides-index',
    seo: seoFor(data.index),
    headings: { h1: [data.index.h1] },
    sections: [],
    guideIndex: data.index,
  };
  const guides = data.guides.map((g) => ({
    path: g.path,
    old_path: g.path,
    type: 'guide',
    seo: seoFor(g),
    headings: { h1: [g.h1] },
    sections: [],
    guide: g,
  }));
  return [index, ...guides];
}
