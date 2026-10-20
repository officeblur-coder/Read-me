import os
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

D = os.path.dirname(os.path.abspath(__file__))
IMG, FNT = os.path.join(D, 'img'), os.path.join(D, 'fonts')
OUT = os.path.join(D, 'prints'); os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)

PAPER = np.array([244, 237, 222], np.float32) / 255
EMER = (31, 61, 46)
GOLD = (132, 99, 45)
GOLD_F = np.array([150, 116, 56], np.float32) / 255


def font(name, size, var):
    f = ImageFont.truetype(os.path.join(FNT, name), size); f.set_variation_by_name(var); return f


def load(n):
    return Image.open(os.path.join(IMG, n)).convert('RGB')


# ---------- source prep ----------
def clean_lake():
    """Remove the annotation labels by cloning nearby scenery over them (feathered)."""
    im = np.asarray(load('i-012.png')).astype(np.float32)
    out = im.copy()
    for (x0, y0, x1, y1), (dx, dy) in [((163, 22, 234, 58), (-76, 3)), ((260, 117, 346, 158), (-84, 0)),
                                       ((8, 30, 78, 77), (0, 48))]:
        h, w = y1 - y0, x1 - x0
        m = np.ones((h, w), np.float32)
        m = cv2.GaussianBlur(np.pad(m[3:-3, 3:-3], 3), (0, 0), 2)[..., None]
        out[y0:y1, x0:x1] = out[y0:y1, x0:x1] * (1 - m) + im[y0 + dy:y1 + dy, x0 + dx:x1 + dx] * m
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def fit_crop(im, aspect, cx=0.5, cy=0.5, box=None):
    if box:
        im = im.crop(box)
    w, h = im.size
    if w / h > aspect:
        nw = int(h * aspect); x0 = int(np.clip(cx * w - nw / 2, 0, w - nw)); return im.crop((x0, 0, x0 + nw, h))
    nh = int(w / aspect); y0 = int(np.clip(cy * h - nh / 2, 0, h - nh)); return im.crop((0, y0, w, y0 + nh))


# ---------- paper ----------
def paper(w, h):
    base = np.ones((h, w, 3), np.float32) * PAPER
    n = np.zeros((h, w), np.float32)
    for s, a in [(2, .012), (8, .007), (60, .006), (400, .008)]:
        small = rng.normal(0, 1, (h // s + 2, w // s + 2)).astype(np.float32)
        n += cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)[:h, :w] * a
    # fibres
    fib = np.zeros((h, w), np.float32)
    for _ in range(int(w * h / 30000)):
        x, y = rng.integers(0, w), rng.integers(0, h); ang = rng.uniform(0, np.pi); L = rng.integers(8, 40)
        cv2.line(fib, (int(x), int(y)), (int(x + L * np.cos(ang)), int(y + L * np.sin(ang))), float(rng.uniform(.015, .035)), 1)
    n -= cv2.GaussianBlur(fib, (0, 0), 0.8)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    v = ((xx / w - .5) ** 2 + (yy / h - .5) ** 2) ** .5
    shade = 1 - 0.10 * np.clip(v - 0.3, 0, 1) ** 1.2
    return np.clip(base * (1 + n[..., None]) * shade[..., None], 0, 1), n


# ---------- photo treatment: printed storybook look ----------
def storybook(im, w, h, tex):
    a = np.asarray(im.resize((w, h), Image.LANCZOS)).astype(np.uint8)
    paint = cv2.edgePreservingFilter(a, flags=cv2.RECURS_FILTER, sigma_s=30, sigma_r=0.25)
    styl = cv2.stylization(cv2.resize(a, (w // 2, h // 2)), sigma_s=25, sigma_r=0.3)
    styl = cv2.resize(styl, (w, h), interpolation=cv2.INTER_CUBIC)
    f = (a.astype(np.float32) * 0.45 + paint * 0.35 + styl * 0.20) / 255
    # grade: gentle desaturation, warm lift, soft curve
    lum = f @ np.array([.299, .587, .114], np.float32)
    f = lum[..., None] + (f - lum[..., None]) * 0.86
    f = 0.055 + f * 0.9
    f = f * np.array([1.03, 1.0, 0.93], np.float32)
    f = f + 0.06 * np.sin(np.pi * f) * (f - 0.5)
    # halation on highlights
    hi = np.clip((lum - .72) / .28, 0, 1)
    hal = cv2.GaussianBlur(hi, (0, 0), w / 120)
    f += hal[..., None] * np.array([.10, .05, .015], np.float32)
    # inner vignette
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    v = ((xx / w - .5) ** 2 * 1.2 + (yy / h - .5) ** 2) ** .5
    f *= (1 - 0.28 * np.clip(v - 0.32, 0, 1) ** 1.3)[..., None]
    # film grain (organic, slightly blurred)
    g = cv2.GaussianBlur(rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), 1.1)
    f += g[..., None] * 0.045 * (0.6 + 0.4 * (1 - lum[..., None]))
    # printed on paper: multiply paper texture
    f *= (1 + tex[..., None] * 2.0)
    return np.clip(f, 0, 1)


def arch_mask(w, h, ss=4):
    m = Image.new('L', (w * ss, h * ss), 0); d = ImageDraw.Draw(m); r = w * ss // 2
    d.ellipse((0, 0, w * ss, 2 * r), fill=255); d.rectangle((0, r, w * ss, h * ss), fill=255)
    return np.asarray(m.resize((w, h), Image.LANCZOS), np.float32) / 255


def rect_mask(w, h):
    return np.ones((h, w), np.float32)


def outline(img, x0, y0, w, h, arch, off, width, color):
    ss = 3
    m = Image.new('L', (img.width * ss, img.height * ss), 0); d = ImageDraw.Draw(m)
    X0, Y0, X1, Y1 = (x0 - off) * ss, (y0 - off) * ss, (x0 + w + off) * ss, (y0 + h + off) * ss
    lw = width * ss
    if arch:
        r = (X1 - X0) // 2
        d.arc((X0, Y0, X1, Y0 + 2 * r), 180, 360, fill=255, width=lw)
        d.line((X0 + lw // 2, Y0 + r, X0 + lw // 2, Y1), fill=255, width=lw)
        d.line((X1 - lw // 2, Y0 + r, X1 - lw // 2, Y1), fill=255, width=lw)
        d.line((X0, Y1 - lw // 2, X1, Y1 - lw // 2), fill=255, width=lw)
    else:
        d.rectangle((X0, Y0, X1, Y1), outline=255, width=lw)
    m = m.resize(img.size, Image.LANCZOS)
    img.paste(Image.new('RGB', img.size, color), (0, 0), m)


# ---------- logo in original colours ----------
LOGO = load('i-014.png'); LOGO_M = Image.open(os.path.join(IMG, 'i-015.png')).convert('L')


def paste_logo(img, cx, cy, width):
    s = width / LOGO.width; sz = (int(LOGO.width * s), int(LOGO.height * s))
    c = LOGO.resize(sz, Image.LANCZOS); m = LOGO_M.resize(sz, Image.LANCZOS)
    # deepen the green a touch so it prints like ink
    arr = np.asarray(c, np.float32)
    lum = arr.mean(2, keepdims=True)
    arr = np.where(lum < 110, arr * 0.85, arr)
    c = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img.paste(c, (int(cx - sz[0] / 2), int(cy - sz[1] / 2)), m)


def text_c(d, xy, s, f, fill, spacing=0, anchor='mm'):
    if spacing == 0:
        d.text(xy, s, font=f, fill=fill, anchor=anchor); return
    widths = [f.getlength(ch) for ch in s]; tw = sum(widths) + spacing * (len(s) - 1)
    x = xy[0] - tw / 2 if anchor[0] == 'm' else (xy[0] - tw if anchor[0] == 'r' else xy[0])
    for ch, cw in zip(s, widths):
        d.text((x, xy[1]), ch, font=f, fill=fill, anchor='l' + anchor[1]); x += cw + spacing


def diamond_rule(d, cx, cy, half, col):
    d.line((cx - half, cy, cx - 22, cy), fill=col, width=3)
    d.line((cx + 22, cy, cx + half, cy), fill=col, width=3)
    d.polygon([(cx, cy - 12), (cx + 12, cy), (cx, cy + 12), (cx - 12, cy)], fill=col)


def finish(img, tex):
    # ink sits in paper: multiply texture once more over everything lightly
    f = np.asarray(img, np.float32) / 255 * (1 + tex[..., None] * 0.4)
    return Image.fromarray((np.clip(f, 0, 1) * 255).astype(np.uint8))


ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']


def portrait(src, title, caption, idx, name):
    W, H = 2400, 3600
    pf, tex = paper(W, H)
    iw, ih = 1840, 2140; x0, y0 = (W - iw) // 2, 640
    ph = storybook(src, iw, ih, tex[y0:y0 + ih, x0:x0 + iw])
    m = arch_mask(iw, ih)[..., None]
    reg = pf[y0:y0 + ih, x0:x0 + iw]
    pf[y0:y0 + ih, x0:x0 + iw] = reg * (1 - m) + ph * m
    img = Image.fromarray((pf * 255).astype(np.uint8))
    outline(img, x0, y0, iw, ih, True, 34, 4, GOLD)
    outline(img, x0, y0, iw, ih, True, 50, 2, GOLD)
    paste_logo(img, W / 2, 330, 1050)
    d = ImageDraw.Draw(img)
    text_c(d, (W / 2, 2990), f'CAPITOLUL {ROMAN[idx]}', font('Cinzel.ttf', 40, 'Regular'), GOLD, spacing=14)
    d.text((W / 2, 3140), title, font=font('CormorantItalic.ttf', 150, 'Medium Italic'), fill=EMER, anchor='mm')
    diamond_rule(d, W // 2, 3290, 260, GOLD)
    text_c(d, (W / 2, 3390), caption, font('Cinzel.ttf', 44, 'Regular'), GOLD, spacing=12)
    finish(img, tex).save(os.path.join(OUT, name), quality=95, dpi=(300, 300))


def landscape(src, title, caption, idx, name):
    W, H = 3600, 2400
    pf, tex = paper(W, H)
    iw, ih = 3040, 1800; x0, y0 = (W - iw) // 2, 190
    ph = storybook(src, iw, ih, tex[y0:y0 + ih, x0:x0 + iw])
    pf[y0:y0 + ih, x0:x0 + iw] = ph
    img = Image.fromarray((pf * 255).astype(np.uint8))
    outline(img, x0, y0, iw, ih, False, 28, 4, GOLD)
    outline(img, x0, y0, iw, ih, False, 42, 2, GOLD)
    paste_logo(img, x0 + 380, 2200, 760)
    d = ImageDraw.Draw(img)
    xr = x0 + iw
    text_c(d, (xr, 2095), f'CAPITOLUL {ROMAN[idx]}', font('Cinzel.ttf', 36, 'Regular'), GOLD, spacing=12, anchor='rm')
    d.text((xr, 2195), title, font=font('CormorantItalic.ttf', 118, 'Medium Italic'), fill=EMER, anchor='rm')
    text_c(d, (xr, 2300), caption, font('Cinzel.ttf', 38, 'Regular'), GOLD, spacing=10, anchor='rm')
    finish(img, tex).save(os.path.join(OUT, name), quality=95, dpi=(300, 300))


def landscape_spread(src, idx, name):
    W, H = 3600, 2400
    pf, tex = paper(W, H)
    iw, ih = 1900, 2020; x0, y0 = 190, 190
    ph = storybook(src, iw, ih, tex[y0:y0 + ih, x0:x0 + iw])
    pf[y0:y0 + ih, x0:x0 + iw] = ph
    img = Image.fromarray((pf * 255).astype(np.uint8))
    outline(img, x0, y0, iw, ih, False, 28, 4, GOLD)
    outline(img, x0, y0, iw, ih, False, 42, 2, GOLD)
    cx = (x0 + iw + W) / 2
    paste_logo(img, cx, 560, 1000)
    d = ImageDraw.Draw(img)
    text_c(d, (cx, 1000), f'CAPITOLUL {ROMAN[idx]}', font('Cinzel.ttf', 40, 'Regular'), GOLD, spacing=14)
    ft = font('CormorantItalic.ttf', 170, 'Medium Italic')
    d.text((cx, 1170), 'Toscana', font=ft, fill=EMER, anchor='mm')
    d.text((cx, 1350), 'Transilvaniei.', font=ft, fill=EMER, anchor='mm')
    diamond_rule(d, int(cx), 1510, 260, GOLD)
    fp = font('Cormorant.ttf', 58, 'Regular')
    for i, line in enumerate(['Pe Dealurile Culpiului, la doar 20 de kilometri', 'de Târgu Mureș, natura, tradiția și pasiunea', 'pentru vin se întâlnesc într-o experiență completă.']):
        d.text((cx, 1640 + i * 84), line, font=fp, fill=(70, 70, 60), anchor='mm')
    text_c(d, (cx, 2020), 'CULPIU · FETEASCĂ REGALĂ & MUSCAT OTTONEL', font('Cinzel.ttf', 36, 'Regular'), GOLD, spacing=10)
    finish(img, tex).save(os.path.join(OUT, name), quality=95, dpi=(300, 300))


if __name__ == '__main__':
    import sys
    hero = load('i-002.png').crop((0, 0, 739, 696))
    grapes = load('i-011.png').crop((0, 0, 324, 300))
    lake = clean_lake().crop((0, 0, 405, 250))
    manor = load('i-010.png').crop((0, 0, 405, 250))
    hall = load('i-013.png').crop((0, 0, 405, 250))
    jobs = {
        'p1': lambda: portrait(fit_crop(hero, 1840 / 2140, 0.62, 0.5), 'Un loc care te găsește.', 'DEALURILE CULPIULUI · TÂRGU MUREȘ', 0, '01_portret_un_loc_care_te_gaseste.jpg'),
        'l1': lambda: landscape(fit_crop(manor, 3040 / 1800, 0.5, 0.5), 'Acasă, printre dealuri.', 'EMERALD MANOR · BOUTIQUE HOTEL', 1, '02_landscape_emerald_manor.jpg'),
        'p2': lambda: portrait(fit_crop(grapes, 1840 / 2140, 0.55, 0.5), 'Totul începe în vie.', 'EMERALD WINERY · DEGUSTĂRI & EXPERIENȚE', 2, '03_portret_emerald_winery.jpg'),
        'l2': lambda: landscape(fit_crop(hall, 3040 / 1800, 0.5, 0.5), 'Momente care rămân.', 'BELVEDERE HALL · SĂLI DE EVENIMENTE', 3, '04_landscape_belvedere_hall.jpg'),
        'p3': lambda: portrait(fit_crop(lake, 1840 / 2140, 0.5, 0.5, box=(132, 0, 347, 250)), 'Pe alei, printre vii.', 'LAKE · NATURĂ & RELAXARE', 4, '05_portret_lake.jpg'),
        'l3': lambda: landscape_spread(fit_crop(hero, 1900 / 2020, 0.6, 0.5), 5, '06_landscape_toscana_transilvaniei.jpg'),
    }
    for k in (sys.argv[1:] or jobs):
        jobs[k](); print('ok', k, flush=True)
