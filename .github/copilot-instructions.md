# Copilot instructions for Face2Face site

## Project context

This repository is a static Astro site for the Face2Face brand, migrated from a legacy Site123 site while preserving the original URL structure. The project is data-driven: most content and SEO metadata live in `src/data/site-content.json`, and the routing layer rebuilds pages at the same legacy paths.

The important architectural constraint is that old URLs must remain stable. The site intentionally treats the imported content JSON as the source of truth rather than creating new route names or new CMS patterns.

## Build, test, and validation commands

This project uses Node 20+.

- Install dependencies:
  - `npm install`
- Start local dev server:
  - `npm run dev` -> http://localhost:4321
- Production build:
  - `npm run build`
- Preview built site:
  - `npm run preview`

Notes:
- `npm run build` also triggers `node scripts/indexnow.mjs` as a `postbuild` step. That script submits the sitemap to IndexNow only when `VERCEL_ENV === 'production'`, and it is intentionally non-fatal if it fails.
- There is no dedicated lint script and no automated test suite configured in `package.json` today. The main validation path for this repository is the Astro production build.
- If a test runner is added later, prefer a focused command for the relevant file or test rather than the full suite.

## High-level architecture

- `src/pages/[...path].astro`
  - This is the single catch-all route for the old Site123 URLs.
  - `getStaticPaths()` generates a static page for each entry in `site-content.json` using `old_path`.
  - The route selects page templates (`Home`, `Services`, `Gallery`, etc.) based on `page.type` and `old_path`.

- `src/data/site-content.json`
  - Canonical content source for page text, SEO metadata, portfolio entries, customers, contact details, and per-page metadata.
  - The project keeps the legacy `old_path` values exactly, including the absence of trailing slash.

- `src/lib/content.ts`
  - Central helper for content access and image metadata.
  - Resolves imported assets from `site-content.json` paths to Astro image metadata via `astro:assets`.
  - Throws on unknown asset paths so broken references fail the build early.
  - Holds shared utilities like `pageByPath()`, `absolute()`, and `toParagraphs()`.

- `src/layouts/Base.astro`
  - Shared page shell.
  - Handles canonical URLs, Open Graph/Twitter meta, analytics and consent-driven tracking scripts, site chrome, and the common header/footer.
  - Contains the sitewide GTM/GA/Meta tracking configuration and the consent banner logic.

- `src/data/redirects.json` + `astro.config.mjs`
  - Maintains the old URLs and 301 redirects from the legacy site.
  - `redirects.json` is loaded into Astro config so the new site preserves the old structure and path behavior.

- `public/assets/media/`
  - Stores persistent static media such as OG images and icons that must stay at fixed URLs.

- `scripts/`
  - Contains one-off migration scripts for converting media/publishing assets; treat them as migration utilities rather than ordinary application code.

## Key conventions for this codebase

- Preserve the legacy URL paths exactly.
  - Do not invent new routes or add trailing slashes on old URLs.
  - The project deliberately uses `trailingSlash: 'never'` in `astro.config.mjs` to match the old URLs.

- Treat content and SEO as data, not component logic.
  - Most page text and metadata are edited in `src/data/site-content.json`, not hard-coded into Astro templates.
  - If a page content change is needed, check the JSON first and then update the corresponding layout if the structure requires it.

- Use the existing Astro asset pipeline for media.
  - Add new images under `src/assets/media` and reference them through the `asset()` helpers or `astro:assets` patterns already used in the project.
  - If a media item is used as an OG image, also provide a JPEG copy under `public/assets/media/og/`.

- Keep route generation and redirect data aligned.
  - If an old path changes or a new migration path is added, update both the generated route logic and the redirect metadata consistently.

- Respect the migration-first structure.
  - The app is not a generic Astro starter; it is an SEO-preserving migration built around exact URL compatibility and content portability from the legacy Site123 site.

- Contact form configuration is env-driven and build-time bound.
  - `PUBLIC_FORM_ENDPOINT` is required for the Web3Forms contact form and must be set in environment config and redeployed after changes because it is embedded during build.

## Related repo notes

- `README.md` is the best source for deployment-specific configuration and migration notes, especially around 301 redirects, OG image handling, Search Console, and old Site123 behavior.
- The repository uses Hebrew content and a RTL layout (`<html lang="he" dir="rtl">`), so content and metadata conventions follow the existing site language.
- The build is static and optimized for SEO, with canonical tags, structured data, and consent-gated third-party scripts.
