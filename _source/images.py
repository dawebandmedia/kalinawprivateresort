"""Process source photos into responsive AVIF/WebP + JPEG fallback, write manifest.json."""
import json, glob, os, base64, io, sys
from PIL import Image, ImageOps, ImageFilter
import numpy as np

RAW = '/root/assets_raw'
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img')
os.makedirs(OUT, exist_ok=True)
feat = sorted(glob.glob(RAW + '/feat/feat-*.jpg'))
tl = {os.path.basename(f)[3:6]: f for f in glob.glob(RAW + '/tl/tl-*.jpg')}
F = lambda i: feat[i]
T = lambda k: tl[k]

# slug: (source, crop box fraction (l,t,r,b) or None)
SRC = {
 # property, professional set
 'courtyard-day': (F(0), None), 'pool-above-day': (F(1), None), 'pool-garden-day': (F(2), None),
 'pavilion-garden-day': (F(3), None),
 'bunk-room': (F(4), None), 'bunk-room-2': (F(5), None), 'bunk-room-3': (F(6), None),
 'rattan-room': (F(7), None), 'rattan-room-2': (F(8), None), 'rattan-room-3': (F(9), None),
 'leaf-room': (F(10), None), 'leaf-room-2': (F(11), None), 'bath': (F(12), None),
 'living': (F(13), None), 'dining': (F(14), None), 'dining-2': (F(15), None), 'dining-long': (F(16), None),
 'dining-long-2': (F(17), None), 'dining-stairs': (F(18), None), 'living-stairs': (F(19), None),
 'living-2': (F(20), None), 'living-3': (F(21), None), 'lounge': (F(22), None), 'lounge-2': (F(23), None),
 'videoke-room': (F(24), None), 'basket-lounge': (F(25), None), 'hall': (F(26), None), 'hall-2': (F(27), None),
 'kitchen': (F(28), None), 'kitchen-2': (F(29), None),
 'conference': (F(30), None), 'conference-2': (F(31), None), 'conference-3': (F(32), None),
 'courtyard-night': (F(33), None), 'pool-night': (F(34), None), 'pool-night-2': (F(35), None),
 'pool-above-night': (F(36), None), 'pool-garden-night': (F(37), None), 'pool-garden-night-2': (F(38), None),
 'balcony-night': (F(39), None), 'balcony-night-2': (F(40), None),
 # timeline / real events
 'gazebo-dinner-night': (T('042'), None), 'billiards': (T('062'), None), 'bridal-glam': (T('144'), None),
 'courtyard-lights': (T('157'), None), 'pool-night-quiet': (T('058'), None), 'poolside-dinner': (T('150'), None),
 'wedding-aisle': (T('069'), None), 'gazebo-reception': (T('112'), None), 'company-outing': (T('172'), None),
 'balloons-poolside': (T('005'), None), 'debut-18': (T('138'), None), 'dining-wedding': (T('176'), None),
 'balloon-arch-pool': (T('116'), None), 'bride-entourage': (T('080'), None), 'gown-poolside': (T('163'), None),
 'family-reunion': (T('145'), None), 'seminar': (T('000'), None), 'teambuilding': (T('032'), None),
 'kids-pool-day': (T('160'), None), 'floral-throne': (T('119'), None), 'garden-party': (T('139'), None),
 'gazebo-blue-night': (T('164'), None), 'courtyard-night-party': (T('121'), None), 'night-dance': (T('128'), None),
 'birthday-indoor': (T('001'), None), 'long-tables-lawn': (T('024'), None), 'lawn-play': (T('055'), None),
 'christmas-party': (T('030'), None), 'reunion-lawn': (T('099'), None), 'billiards-play': (T('078'), None),
 'birthday-75': (T('016'), (0, 0.22, 1, 1)),
}
WIDTHS = [480, 960, 1440, 2048]

def lqip(im):
    t = im.copy(); t.thumbnail((24, 24)); t = t.filter(ImageFilter.GaussianBlur(0.6))
    b = io.BytesIO(); t.save(b, 'WEBP', quality=40); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

def dominant(im):
    t = im.copy(); t.thumbnail((32, 32)); a = np.asarray(t).reshape(-1, 3).mean(0)
    return '#%02x%02x%02x' % tuple(int(x) for x in a)

def process(slug, path, crop, extra_widths=None):
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    if crop:
        w, h = im.size; im = im.crop((int(crop[0]*w), int(crop[1]*h), int(crop[2]*w), int(crop[3]*h)))
    w, h = im.size
    widths = sorted(set([x for x in (extra_widths or WIDTHS) if x < w] + [min(w, (extra_widths or WIDTHS)[-1])]))
    for W in widths:
        r = im if W == w else im.resize((W, round(h * W / w)), Image.LANCZOS)
        r.save(f'{OUT}/{slug}-{W}.avif', 'AVIF', quality=58, speed=6)
        r.save(f'{OUT}/{slug}-{W}.webp', 'WEBP', quality=78, method=5)
    # jpeg fallback at mid size
    jw = min(w, 1440); r = im.resize((jw, round(h * jw / w)), Image.LANCZOS)
    r.save(f'{OUT}/{slug}.jpg', 'JPEG', quality=80, optimize=True, progressive=True)
    return {'w': w, 'h': h, 'widths': widths, 'lqip': lqip(im), 'color': dominant(im)}

if __name__ == '__main__':
    only = set(sys.argv[1:])
    mpath = os.path.join(os.path.dirname(__file__), 'manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {}
    for slug, (p, c) in SRC.items():
        if only and slug not in only: continue
        if slug in man and not only: continue
        man[slug] = process(slug, p, c); print('ok', slug, man[slug]['w'], man[slug]['h'], flush=True)
    json.dump(man, open(mpath, 'w'), indent=1)
