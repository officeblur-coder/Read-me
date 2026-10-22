# Desface flyer.png pe layere: fundal curat (inpaint), saxofonist, texte separate.
# Rezultat: layers/*.png (1080x1920, transparente) + layers/layers.json
import json, pathlib
import numpy as np, cv2
from PIL import Image

D = pathlib.Path(__file__).parent
L = D / 'layers'
W, H = 1080, 1920
src = np.array(Image.open(D / 'flyer.png').convert('RGB')).astype(np.float32) / 255
h0, w0 = src.shape[:2]
lum = src @ np.array([.299, .587, .114], np.float32)
hsv = cv2.cvtColor((src * 255).astype(np.uint8), cv2.COLOR_RGB2HSV)
sat = hsv[..., 1].astype(np.float32) / 255

def text_alpha(box, k, lo, hi):
    """Alpha pentru text deschis pe fundal închis: luminanța minus 'opening' morfologic."""
    x0, y0, x1, y1 = box
    a = np.zeros((h0, w0), np.float32)
    pad = k
    sl = lum[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad]
    bg = cv2.morphologyEx(sl, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    bg = cv2.GaussianBlur(bg, (0, 0), k / 4)
    d = np.clip((sl - bg - lo) / (hi - lo), 0, 1)
    a[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = d
    m = np.zeros_like(a); m[y0:y1, x0:x1] = 1
    return a * m

layers = {}
logo = text_alpha((295, 75, 645, 185), 25, .04, .30)
date = text_alpha((88, 232, 268, 485), 31, .04, .30)
vline = text_alpha((66, 232, 82, 640), 9, .02, .14)
vline2 = text_alpha((268, 232, 282, 410), 9, .02, .14)
title = text_alpha((205, 840, 735, 1182), 61, .05, .32)
hp = text_alpha((200, 1180, 750, 1226), 15, .04, .30)
hpline = text_alpha((230, 1226, 720, 1246), 9, .02, .18)
banner = text_alpha((150, 1245, 870, 1445), 31, .03, .22)
rsvp = text_alpha((290, 1470, 660, 1550), 15, .04, .30)
lines2 = text_alpha((320, 1452, 620, 1470), 9, .02, .18) + text_alpha((320, 1550, 620, 1566), 9, .02, .18)

# LORI (crem) vs SAX (portocaliu) după saturație, netezit
orange = cv2.GaussianBlur(np.clip((sat - .32) / .18, 0, 1), (0, 0), 2.5)
orange[:1000] = 0
lori = title * (1 - orange)
lori[1003:, 338:] = 0  # sub LORI rămâne doar piciorul lui L
sax = title - lori

# Banner: separă literele (componente mici) de tușa de pensulă
bm = (banner > .25).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(bm, 8)
txt = np.zeros_like(bm)
for i in range(1, n):
    x, y, w, h, area = st[i]
    if 12 <= h <= 60 and w <= 60 and 255 <= x <= 730 and 1280 <= y <= 1410 and area > 25:
        txt[lab == i] = 1
txt = cv2.dilate(txt, np.ones((3, 3), np.uint8)).astype(np.float32)
btxt, bbrush = banner * txt, banner * (1 - txt)

# Saxofonist (BiRefNet), estompat jos sub titlu
man = np.array(Image.open(L / '_mask_birefnet-portrait.png').convert('L')).astype(np.float32) / 255
yy = np.arange(h0)[:, None]
man *= np.clip((1010 - yy) / 140, 0, 1)

# Fundal: inpaint sub tot ce e text + o dilatare a siluetei
allt = np.maximum.reduce([logo, date, vline, vline2, title, hp, hpline, banner, rsvp, lines2])
hole = cv2.dilate((allt > .015).astype(np.uint8), np.ones((7, 7), np.uint8))
manhole = cv2.dilate((man > .2).astype(np.uint8), np.ones((15, 15), np.uint8))
manhole[820:860, 660:700] = 1  # reflexie rămasă
src8 = (src * 255).astype(np.uint8)
plate = cv2.inpaint(src8, hole, 5, cv2.INPAINT_TELEA)
plate_noman = cv2.inpaint(plate, manhole, 9, cv2.INPAINT_TELEA)
# umple zona siluetei cu o versiune mai difuză (doar marginile se văd la paralaxă)
blur = cv2.GaussianBlur(plate_noman, (0, 0), 14).astype(np.float32) * .28
mm = cv2.GaussianBlur(manhole.astype(np.float32), (0, 0), 18)[..., None]
plate_noman = (plate_noman * (1 - mm) + blur * mm).astype(np.uint8)
platef = plate.astype(np.float32) / 255

def unmix(a):
    a3 = a[..., None]
    c = np.where(a3 > .02, (src - (1 - a3) * platef) / np.maximum(a3, 1e-3), src)
    return np.clip(c, 0, 1)

def save(name, rgb, a):
    ys, xs = np.where(a > .004)
    x0, y0, x1, y1 = xs.min() - 4, ys.min() - 4, xs.max() + 5, ys.max() + 5
    x0, y0 = max(0, x0), max(0, y0)
    rgba = np.dstack([rgb, a])[y0:y1, x0:x1]
    s = W / w0
    X0, Y0 = round(x0 * s), round(y0 * s)
    w, h = round((x1 - x0) * s), round((y1 - y0) * s)
    im = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), 'RGBA').resize((w, h), Image.LANCZOS)
    im.save(L / f'{name}.png', optimize=True)
    layers[name] = dict(x=X0, y=Y0, w=w, h=h)

full = lambda a: unmix(a)
Image.fromarray(plate_noman).resize((W, H), Image.LANCZOS).save(L / 'bg.jpg', quality=95)
layers['bg'] = dict(x=0, y=0, w=W, h=H)
save('man', platef, man)
for nm, a in [('logo', logo), ('date', date), ('vline', vline), ('vline2', vline2), ('lori', lori), ('sax', sax),
              ('hp', hp), ('hpline', hpline), ('brush', bbrush), ('btext', btxt), ('rsvp', rsvp), ('lines2', lines2)]:
    save(nm, full(a), a)
(L / 'layers.json').write_text(json.dumps(layers, indent=1))

# verificare: recompunere
S = Image.fromarray(plate_noman).resize((W, H)).convert('RGBA')
for nm in ['man', 'logo', 'date', 'vline', 'vline2', 'lori', 'sax', 'hp', 'hpline', 'brush', 'btext', 'rsvp', 'lines2']:
    g = layers[nm]; S.alpha_composite(Image.open(L / f'{nm}.png'), (g['x'], g['y']))
S.convert('RGB').save(L / '_recomposed.jpg', quality=90)
print(json.dumps(layers))
