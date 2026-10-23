# Face2Face – fc2fc.co.il (Astro)

האתר של נגה מלסה / Face2Face, אחרי מעבר מ-Site123 ל-Astro. כל 182 העמודים של האתר הישן נבנים **באותן כתובות URL בדיוק**.

## הרצה

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # בונה ל-dist/
npm run preview  # מציג את dist/
```

## מבנה

| קובץ / תיקייה | מה יש בו |
|---|---|
| `src/data/site-content.json` | כל התוכן וה-SEO שנשלפו מהאתר הישן (טקסטים, Meta, כותרות, תיק עבודות, לקוחות, פרטי קשר) |
| `src/data/media-manifest.json` | כל קובץ מדיה: נתיב מקומי, כתובת מקורית ב-Site123, alt |
| `src/data/media-dims.json` | מידות התמונות (למניעת קפיצות בטעינה) |
| `src/pages/[...path].astro` | הנתב היחיד – יוצר עמוד לכל `old_path` ב-site-content.json |
| `src/components/` | המקטעים: Hero, Services, Gallery, About, Clients, Counters, Contact, Legal, PortfolioItem, Popup |
| `src/layouts/Base.astro` | ה-head (SEO, GTM, Meta Pixel, Search Console, Schema), כותרת, פוטר, WhatsApp, באנר Cookies |
| `public/assets/media/` | כל התמונות ב-WebP (עד 2000px). `og/` – עותקי JPEG ‏1200px לתצוגה מקדימה בשיתוף (Facebook/WhatsApp) |
| `media-originals/` | ארכיון בלבד, לא עולה לאתר ולא ל-git: המקורות ברזולוציה מלאה (~1GB), ו-`site123-web/` – קובצי ה-PNG/JPG לפני ההמרה |
| `scripts/` | סקריפטי ההמרה ל-WebP ועדכון ההפניות (חד-פעמיים, נשמרו לתיעוד) |
| `redirects.json` | כל הכתובות הישנות + הפניות 301. השדה `astro` נטען אוטומטית ל-`astro.config.mjs` |
| `tracking-and-forms.txt` | תיעוד קודי המעקב והטפסים מהאתר הישן |

## עריכת תוכן

התוכן נמצא ב-`src/data/site-content.json`, תחת `site` (תוכן משותף: שירותים, אודות, לקוחות, תיק עבודות, פרטי קשר) ו-`pages` (SEO וטקסט של כל עמוד).

## לפני העלייה לאוויר

1. **טופס צור קשר** – אתר סטטי לא שולח טפסים לבד. פתחו טופס ב-Formspree (או שירות דומה), העתיקו את `.env.example` ל-`.env` ושימו את הכתובת ב-`PUBLIC_FORM_ENDPOINT`. בלי זה הטופס מציג הודעה להשתמש ב-WhatsApp.
2. **הפניות 301** – `npm run dev` מחזיר 301 אמיתי. בבנייה סטטית Astro יוצר עמודי הפניה (meta refresh). לקבלת 301 אמיתי בשרת: Netlify / Vercel עם ה-adapter שלהם, או הגדרת הפניות בשרת לפי `redirects.json`.
3. **כתובות ללא `/` בסוף** – האתר בנוי כ-`/שירותים.html`. רוב שירותי האחסון (Netlify, Vercel, Cloudflare Pages) מגישים אותו ב-`/שירותים` אוטומטית.
4. **Search Console** – אחרי ההחלפה, להגיש את `https://www.fc2fc.co.il/sitemap-index.xml`.
5. **תמונות חדשות** – להוסיף כ-WebP (ולא PNG כבד). מי שמשמשת גם כ-og:image צריכה גם עותק JPEG ב-`og/`.
