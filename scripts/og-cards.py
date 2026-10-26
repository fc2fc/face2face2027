# Renders the Face2Face link-share cards (1200x630) in the style of f2f-share-v5:
# full-bleed photo, dark-navy fade on the text side, pink Almoni headline, white handwritten accent,
# three-colour brand bar, white subtitle, light logo top-left.
#
# Usage:  MELATEF=/path/to/FbMelatef-Mudgash.ttf python3 scripts/og-cards.py [name ...]
# Output: public/assets/media/og/f2f-share-<name>.jpg  (the handwriting font is licensed, so it is not in the repo)
import os, sys, pathlib, shutil, tempfile
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = pathlib.Path(tempfile.mkdtemp())
UP = ROOT / 'src/assets/media/uploads'
PHOTOS = {'services.jpg': '696ac4dabc7f9', 'works.jpg': '688b849616151', 'clients.jpg': '688b849666c39',
          'numbers.jpg': '688b84ab155e0', 'about.jpg': '6883cf3ad224c', 'contact.jpg': 'hero-eye-contact'}
for out, src in PHOTOS.items():
    Image.open(UP / f'{src}.webp').convert('RGB').save(D / out, quality=95)
Image.open(ROOT / 'src/assets/media/brand/logo-light@2x.webp').save(D / 'logo.png')
for w in ('700', '900'):
    shutil.copy(ROOT / f'public/fonts/almoni-dl-{w}.woff2', D)
shutil.copy(os.environ['MELATEF'], D / 'melatef-b.ttf')
CARDS = [
    # name, photo, object-position, photo box (left, width), line1, line2, accent, subtitle
    ('services', 'services.jpg', '62% 35%', (300, 900), 'סטילס.', 'וידאו!', 'עיצוב', 'כל השירותים במקום אחד'),
    ('works',    'works.jpg',    '50% 40%', (0, 1200),  'תיק',    'עבודות.', 'נבחרות', 'פורטרטים · תדמית · אירועים · וידאו'),
    ('clients',  'clients.jpg',  '60% 45%', (0, 1200),  'בין',    'לקוחותינו', 'גאים', 'משרדי ממשלה, ארגונים ועסקים'),
    ('numbers',  'numbers.jpg',  '50% 50%', (0, 1200),  '16',     'שנים.',   'במספרים', 'מאחורי המצלמה מאז 2010'),
    ('about',    'about.jpg',    '45% 22%', (560, 640), 'נגה',    'מלסה.',   'נעים מאוד', 'צלם ומעצב גרפי · מייסד Face2Face'),
    ('contact',  'contact.jpg',  '30% 40%', (430, 770),  'בואו',   'נדבר!',   'עכשיו', '052-813-3633 · וואטסאפ, טלפון או מייל'),
]

TPL = """<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(almoni-dl-900.woff2);font-weight:900}
@font-face{font-family:A;src:url(almoni-dl-700.woff2);font-weight:700}
@font-face{font-family:H;src:url(melatef-b.ttf)}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:#0a0a1c;font-family:A}
.photo{position:absolute;top:0;height:630px;left:%(pl)dpx;width:%(pw)dpx;object-fit:cover;object-position:%(pos)s}
.fade{position:absolute;inset:0;background:
  linear-gradient(90deg,#0a0a1c 0%%,rgba(10,10,28,.96) 30%%,rgba(10,10,28,.72) 46%%,rgba(10,10,28,.12) 66%%,rgba(10,10,28,0) 78%%),
  linear-gradient(0deg,rgba(10,10,28,.55),rgba(10,10,28,0) 35%%)}
.glow{display:none}
.logo{position:absolute;left:70px;top:52px;width:172px}
.txt{position:absolute;left:70px;width:560px;top:118px;text-align:right}
.big{font-weight:900;color:#e10085;line-height:.86;letter-spacing:-.01em;white-space:nowrap;text-shadow:0 6px 30px rgba(0,0,0,.35)}
.l1{font-size:%(fs1)dpx}.l2{font-size:%(fs2)dpx;margin-top:34px}
.acc{position:absolute;right:%(accx)dpx;top:%(accy)dpx;font-family:H;color:#fff;font-size:%(afs)dpx;line-height:1;
  transform:rotate(-11deg);transform-origin:right center;white-space:nowrap;text-shadow:0 0 3px rgba(10,10,28,.95),0 0 10px rgba(10,10,28,.85),0 6px 24px rgba(0,0,0,.6)}
.bar{display:flex;gap:0;margin:34px 0 0 auto;width:120px;height:6px}
.bar i{flex:1}.bar i:nth-child(1){background:#e10085}.bar i:nth-child(2){background:#04a8f1}.bar i:nth-child(3){background:#f7e71a}
.sub{margin-top:22px;color:#fff;font-weight:900;font-size:%(sfs)dpx;line-height:1.2;white-space:nowrap}
</style></head><body>
<img class="photo" src="%(photo)s"><div class="fade"></div><div class="glow"></div>
<img class="logo" src="logo.png">
<div class="txt"><div class="big l1">%(l1)s</div><div class="big l2">%(l2)s</div>
<div class="acc">%(acc)s</div>
<div class="bar"><i></i><i></i><i></i></div><div class="sub">%(sub)s</div></div>
</body></html>"""

def fit(text, base):
    # Almoni Black Hebrew glyphs are ~0.56em wide; keep each line inside the 560px column
    n = max(len(text), 1)
    return int(min(base, 560 / (0.56 * n)))

only = set(sys.argv[1:])
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
    for name, photo, pos, (pl, pw), l1, l2, acc, sub in CARDS:
        if only and name not in only:
            continue
        fs1, fs2 = fit(l1, 168), fit(l2, 168)
        html = TPL % dict(photo=photo, pos=pos, pl=pl, pw=pw, l1=l1, l2=l2, acc=acc, sub=sub,
                          fs1=fs1, fs2=fs2, afs=215 if len(acc) <= 5 else 170,
                          accx=(150 if len(acc) <= 5 else 120), accy=int(fs1 * 0.86 - 12 - (215 if len(acc) <= 5 else 170) * 0.55), sfs=34 if len(sub) <= 26 else 29)
        f = D / f'{name}.html'
        f.write_text(html, encoding='utf-8')
        pg.goto(f.as_uri())
        pg.evaluate('document.fonts.ready')
        pg.wait_for_timeout(300)
        pg.screenshot(path=str(D / f'{name}-card.png'))
        Image.open(D / f'{name}-card.png').convert('RGB').save(
            ROOT / f'public/assets/media/og/f2f-share-{name}.jpg', quality=86, optimize=True, progressive=True)
    b.close()
print('ok')
