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
logo = text_alpha((235, 100, 705, 245), 31, .04, .30)
date = text_alpha((80, 295, 295, 610), 41, .04, .30)
vline = text_alpha((30, 280, 52, 800), 9, .015, .10)
title = text_alpha((85, 965, 941, 1285), 81, .05, .32)
party = text_alpha((110, 1285, 850, 1355), 41, .04, .30)
rsvp = text_alpha((285, 1428, 665, 1508), 15, .04, .30)
lines2 = text_alpha((330, 1405, 610, 1425), 9, .02, .18) + text_alpha((330, 1517, 610, 1538), 9, .02, .18)

# SAX: litere crem vs. flare portocaliu (după saturație) vs. valul de sub litere
flare = cv2.GaussianBlur(np.clip((sat - .45) / .2, 0, 1), (0, 0), 2) * title
letters = title - flare
yy0 = np.arange(h0)[:, None]; xx0 = np.arange(w0)[None, :]
wmask = ((yy0 >= 1236) & (xx0 >= 335)).astype(np.float32)
wave = letters * wmask
sax = letters * (1 - wmask)

# Saxofonist (BiRefNet), estompat jos sub titlu
man = np.array(Image.open(L / '_mask_birefnet-portrait.png').convert('L')).astype(np.float32) / 255
yy = np.arange(h0)[:, None]
man *= np.clip((1060 - yy) / 110, 0, 1)

# Fundal: inpaint sub tot ce e text + o dilatare a siluetei
allt = np.maximum.reduce([logo, date, vline, title, party, rsvp, lines2])
hole = cv2.dilate((allt > .015).astype(np.uint8), np.ones((7, 7), np.uint8))
manhole = cv2.dilate((man > .2).astype(np.uint8), np.ones((15, 15), np.uint8))
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
for nm, a in [('logo', logo), ('date', date), ('vline', vline), ('sax', sax), ('flare', flare), ('wave', wave),
              ('party', party), ('rsvp', rsvp), ('lines2', lines2)]:
    save(nm, full(a), a)
(L / 'layers.json').write_text(json.dumps(layers, indent=1))

# verificare: recompunere
S = Image.fromarray(plate_noman).resize((W, H)).convert('RGBA')
for nm in ['man', 'logo', 'date', 'vline', 'sax', 'flare', 'wave', 'party', 'rsvp', 'lines2']:
    g = layers[nm]; S.alpha_composite(Image.open(L / f'{nm}.png'), (g['x'], g['y']))
S.convert('RGB').save(L / '_recomposed.jpg', quality=90)
print(json.dumps(layers))
