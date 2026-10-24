// Single source of truth for the Hero poster (the LCP image): the <Picture> in Hero.astro and the
// <link rel="preload"> in the page head must request exactly the same candidates, otherwise the
// browser downloads the image twice.
export const HERO_POSTER = {
  src: '/assets/media/uploads/hero-eye-contact.webp',
  widths: [480, 828, 1280, 1920],
  sizes: '(max-width: 768px) 100vw, 84vw',
} as const;
