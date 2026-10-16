import os, sys, math, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from multiprocessing import Pool

D = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(D, 'img')
FNT = os.path.join(D, 'fonts')
W, H, FPS = 1080, 1920, 30
DUR = 32.0
NF = int(DUR * FPS)
PREVIEW = os.environ.get('PREVIEW')

GOLD_TOP = np.array([0.98, 0.88, 0.62], np.float32)
GOLD_MID = np.array([0.78, 0.58, 0.25], np.float32)
GOLD_BOT = np.array([0.93, 0.78, 0.45], np.float32)
WHITE = np.array([0.98, 0.96, 0.92], np.float32)


# ---------- easing ----------
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))

def prog(t, t0, t1):
    return clamp((t - t0) / (t1 - t0))

def eio(x):  # ease in-out cubic
    x = clamp(x)
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2

def eout(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3

def eoutback(x):
    x = clamp(x); c1 = 1.4; c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2

def fade(t, a, b, c, d):  # in a->b, out c->d
    return eio(prog(t, a, b)) * (1 - eio(prog(t, c, d)))


# ---------- assets ----------
def load(name):
    return Image.open(os.path.join(IMG, name)).convert('RGB')

def to_f(im):
    return np.asarray(im, np.float32) / 255.0

def font(name, size, var=None):
    f = ImageFont.truetype(os.path.join(FNT, name), size)
    if var:
        f.set_variation_by_name(var)
    return f

def gold_fill(h, w):
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    c = np.where(y < .5, GOLD_TOP + (GOLD_MID - GOLD_TOP) * (y / .5), GOLD_MID + (GOLD_BOT - GOLD_MID) * ((y - .5) / .5))
    return np.broadcast_to(c, (h, w, 3)).copy()


class Layer:
    """Straight-alpha float layer: col (h,w,3), a (h,w)."""
    def __init__(self, col, a):
        self.col, self.a = col.astype(np.float32), a.astype(np.float32)
        self.h, self.w = a.shape


def text_layer(txt, fnt, color='gold', spacing=0, shadow=True, glow=False):
    # measure per char for tracking
    pad = int(fnt.size * 0.6)
    widths = [fnt.getlength(ch) for ch in txt]
    tw = int(sum(widths) + spacing * (len(txt) - 1)) + 2 * pad
    asc, desc = fnt.getmetrics()
    th = asc + desc + 2 * pad
    m = Image.new('L', (tw, th), 0)
    d = ImageDraw.Draw(m)
    x = pad
    for ch, cw in zip(txt, widths):
        d.text((x, pad), ch, font=fnt, fill=255)
        x += cw + spacing
    a = np.asarray(m, np.float32) / 255.0
    col = gold_fill(th, tw) if isinstance(color, str) else np.broadcast_to(np.array(color, np.float32), (th, tw, 3)).copy()
    if shadow or glow:
        r = max(2, fnt.size // 10)
        b = np.asarray(m.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255.0
        if glow:
            gc = np.array([1.0, 0.8, 0.45], np.float32)
            sa = np.clip(b * 0.9, 0, 1)
            outa = a + sa * (1 - a)
            col = (col * a[..., None] + gc * (sa * (1 - a))[..., None]) / np.maximum(outa, 1e-4)[..., None]
            a = outa
        else:
            sa = np.clip(b * 0.75, 0, 1)
            outa = a + sa * (1 - a)
            col = (col * a[..., None]) / np.maximum(outa, 1e-4)[..., None]
            a = outa
    return Layer(col, a)


def composite(base, L, cx, cy, op=1.0, amask=None):
    """Place layer centered at (cx,cy)."""
    if op <= 0.002:
        return
    x0 = int(round(cx - L.w / 2)); y0 = int(round(cy - L.h / 2))
    bx0, by0 = max(0, x0), max(0, y0)
    bx1, by1 = min(W, x0 + L.w), min(H, y0 + L.h)
    if bx1 <= bx0 or by1 <= by0:
        return
    lx0, ly0 = bx0 - x0, by0 - y0
    a = L.a[ly0:ly0 + by1 - by0, lx0:lx0 + bx1 - bx0] * op
    if amask is not None:
        a = a * amask[ly0:ly0 + by1 - by0, lx0:lx0 + bx1 - bx0]
    c = L.col[ly0:ly0 + by1 - by0, lx0:lx0 + bx1 - bx0]
    reg = base[by0:by1, bx0:bx1]
    reg += (c - reg) * a[..., None]


def wipe_mask(L, p, soft=0.15, reverse=False):
    x = np.linspace(0, 1, L.w, dtype=np.float32)
    if reverse:
        x = 1 - x
    edge = p * (1 + soft) - soft
    m = np.clip((edge - x) / soft + 1, 0, 1) if soft > 0 else (x <= p).astype(np.float32)
    m = np.clip((p * (1 + soft) - x) / soft, 0, 1)
    return np.broadcast_to(m[None, :], (L.h, L.w))


def scale_layer(L, s):
    if abs(s - 1) < 1e-3:
        return L
    w, h = max(1, int(L.w * s)), max(1, int(L.h * s))
    rgba = np.dstack([L.col, L.a])
    im = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), 'RGBA').resize((w, h), Image.BICUBIC)
    arr = np.asarray(im, np.float32) / 255
    return Layer(arr[..., :3], arr[..., 3])


# backgrounds
yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
xx = np.linspace(0, 1, W, dtype=np.float32)[None, :]
rad = np.sqrt(((xx - .5) * 1.0) ** 2 + ((yy - .45) * 0.75) ** 2)
EMERALD = (np.array([0.05, 0.19, 0.14], np.float32) * (1 - np.clip(rad * 1.4, 0, 1))[..., None]
           + np.array([0.012, 0.05, 0.035], np.float32) * np.clip(rad * 1.4, 0, 1)[..., None]).astype(np.float32)
VIGN = (1 - 0.55 * np.clip((rad - 0.25) * 1.6, 0, 1) ** 1.5)[..., None].astype(np.float32)

# Logo -> gold recolor via mask
logo_rgb = load('i-014.png'); logo_m = Image.open(os.path.join(IMG, 'i-015.png')).convert('L')
LOGO_SRC = Image.merge('RGBA', (*logo_rgb.split(), logo_m))


def logo_layer(width):
    s = width / LOGO_SRC.width
    m = logo_m.resize((int(LOGO_SRC.width * s), int(LOGO_SRC.height * s)), Image.LANCZOS)
    a = np.asarray(m, np.float32) / 255
    col = gold_fill(*a.shape)
    b = np.asarray(m.filter(ImageFilter.GaussianBlur(14)), np.float32) / 255
    # soft glow halo
    gc = np.array([1.0, 0.78, 0.4], np.float32)
    sa = np.clip(b * 0.55, 0, 1)
    outa = a + sa * (1 - a)
    col = (col * a[..., None] + gc * (sa * (1 - a))[..., None]) / np.maximum(outa, 1e-4)[..., None]
    return Layer(col, outa), a

LOGO_BIG, LOGO_BIG_CORE = logo_layer(940)
LOGO_END, LOGO_END_CORE = logo_layer(860)

vine_rgb = load('i-006.png'); vine_m = Image.open(os.path.join(IMG, 'i-007.png')).convert('L')
def vine_layer(width, flip=False):
    s = width / vine_rgb.width
    sz = (int(vine_rgb.width * s), int(vine_rgb.height * s))
    c = vine_rgb.resize(sz, Image.LANCZOS); m = vine_m.resize(sz, Image.LANCZOS)
    if flip:
        c = c.transpose(Image.FLIP_LEFT_RIGHT); m = m.transpose(Image.FLIP_LEFT_RIGHT)
    return Layer(to_f(c) * 1.25, np.asarray(m, np.float32) / 255 * 0.85)
VINE_L = vine_layer(560)
VINE_R = vine_layer(560, flip=True)

qr = load('i-016.png').resize((300, 300), Image.NEAREST)
qrc = Image.new('RGB', (324, 324), (245, 240, 228)); qrc.paste(qr, (12, 12))
QR = Layer(to_f(qrc), np.ones((324, 324), np.float32))

# Hero (bottle) — tall crop around glass+bottle, upscaled
hero = load('i-002.png')
hero_crop = hero.crop((250, 0, 250 + int(705 * 9 / 16) + 20, 700))
HERO = hero_crop.resize((hero_crop.width * 3, hero_crop.height * 3), Image.LANCZOS).filter(ImageFilter.UnsharpMask(3, 60, 2))
HERO_BLUR = hero.resize((hero.width * 2, hero.height * 2), Image.LANCZOS)

# Feature cards: crop off embedded logo strip
CARDS = [
    ('i-010.png', (0, 0, 405, 250), 'EMERALD MANOR', 'BOUTIQUE HOTEL'),
    ('i-011.png', (0, 0, 324, 300), 'EMERALD WINERY', 'DEGUSTĂRI & EXPERIENȚE'),
    ('i-012.png', (0, 0, 405, 250), 'LAKE', 'NATURĂ & RELAXARE'),
    ('i-013.png', (0, 0, 405, 250), 'SĂLI DE EVENIMENTE', 'BELVEDERE HALL'),
]
FRAME_W, FRAME_H = 920, 1060
card_data = []
for fn, box, title, sub in CARDS:
    im = load(fn).crop(box)
    big = im.resize((im.width * 4, im.height * 4), Image.LANCZOS).filter(ImageFilter.UnsharpMask(3, 70, 2))
    # blurred full-screen background
    r = max(W / im.width, H / im.height)
    bg = im.resize((int(im.width * r) + 2, int(im.height * r) + 2), Image.BILINEAR)
    bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2, (bg.width - W) // 2 + W, (bg.height - H) // 2 + H)).filter(ImageFilter.GaussianBlur(40))
    bgf = to_f(bg) * 0.35 + EMERALD * 0.55
    card_data.append(dict(big=big, bg=bgf.astype(np.float32), title=title, sub=sub))

# text layers
F_CINZEL = lambda s, v='Regular': font('Cinzel.ttf', s, v)
F_CORM = lambda s, v='Regular': font('Cormorant.ttf', s, v)
F_CORMI = lambda s, v='Italic': font('CormorantItalic.ttf', s, v)

T_TAG = text_layer('CONAC · CRAMĂ · EVENIMENTE · TRADIȚIE', F_CINZEL(34), spacing=4)
T_UNLOC = text_layer('Un loc', F_CORM(170, 'Medium'), color=WHITE)
T_CARETE = text_layer('care te', F_CORM(170, 'Medium'), color=WHITE)
T_GASESTE = text_layer('găsește.', F_CORMI(190, 'Medium Italic'), glow=True)
P_LINES = ['Pe Dealurile Culpiului,', 'la doar 20 de kilometri', 'de Târgu Mureș']
T_PARA = [text_layer(s, F_CORM(66, 'Medium'), color=WHITE) for s in P_LINES]
T_PARA2 = text_layer('natura, tradiția și pasiunea pentru vin', F_CORMI(48, 'SemiBold Italic'), color=GOLD_TOP)
T_PARA3 = text_layer('se întâlnesc într-o experiență completă.', F_CORMI(48, 'SemiBold Italic'), color=GOLD_TOP)
for c in card_data:
    c['T'] = text_layer(c['title'], F_CINZEL(78 if len(c['title']) < 16 else 66, 'Bold'), spacing=3, glow=True)
    c['S'] = text_layer(c['sub'], F_CORM(44, 'SemiBold'), color=WHITE, spacing=9)
T_NUM = [text_layer(f'0{i+1}  /  04', F_CINZEL(40, 'Bold'), spacing=8, glow=True) for i in range(4)]
T_EXP = text_layer('O experiență completă', F_CORMI(96, 'Medium Italic'), glow=True)
T_TOSC = text_layer('TOSCANA TRANSILVANIEI', F_CINZEL(44), spacing=16)
T_WEB = text_layer('domeniileemerald.ro', F_CORM(66, 'Medium'), color=WHITE, spacing=6)
T_DESC = text_layer('DESCOPERĂ POVESTEA', F_CINZEL(28), spacing=8)
T_DISC1 = text_layer('Atenție: imaginea este doar o schiță. O primă reprezentare a felului', F_CORMI(28), color=(0.75, 0.75, 0.7), shadow=False)
T_DISC2 = text_layer('în care ne imaginăm ceea ce urmează să construim.', F_CORMI(28), color=(0.75, 0.75, 0.7), shadow=False)

# particles (gold bokeh)
rng = np.random.default_rng(7)
NP = 90
P_X = rng.uniform(0, W, NP); P_Y = rng.uniform(0, H, NP)
P_VY = rng.uniform(-60, -18, NP); P_VX = rng.uniform(-12, 12, NP)
P_R = rng.choice([3, 4, 6, 9, 14, 22], NP, p=[.3, .25, .2, .12, .08, .05])
P_PH = rng.uniform(0, 6.28, NP); P_I = rng.uniform(0.25, 0.9, NP)
SPRITES = {}
for r in set(P_R.tolist()):
    s = int(r * 4)
    g = np.linspace(-s, s, 2 * s + 1, dtype=np.float32)
    d2 = g[None, :] ** 2 + g[:, None] ** 2
    core = np.exp(-d2 / (2 * (r * 0.55) ** 2)) + 0.35 * np.exp(-d2 / (2 * (r * 1.6) ** 2))
    SPRITES[r] = core.astype(np.float32)
PCOL = np.array([1.0, 0.82, 0.5], np.float32)


def particles(base, t, amt):
    if amt <= 0.01:
        return
    for i in range(NP):
        r = int(P_R[i]); sp = SPRITES[r]; s = sp.shape[0] // 2
        x = (P_X[i] + P_VX[i] * t + 25 * math.sin(t * 0.6 + P_PH[i])) % W
        y = (P_Y[i] + P_VY[i] * t) % (H + 200) - 100
        tw = 0.6 + 0.4 * math.sin(t * 2.2 + P_PH[i] * 3)
        k = amt * P_I[i] * tw * (0.55 if r >= 14 else 1.0)
        xi, yi = int(x), int(y)
        x0, y0, x1, y1 = xi - s, yi - s, xi + s + 1, yi + s + 1
        bx0, by0, bx1, by1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
        if bx1 <= bx0 or by1 <= by0:
            continue
        a = sp[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0] * k
        base[by0:by1, bx0:bx1] += a[..., None] * PCOL * 0.6


def kenburns(src, t, z0, z1, c0, c1, out=(W, H)):
    """src PIL; zoom from z0->z1 (1=cover), center normalized c0->c1."""
    ow, oh = out
    z = z0 + (z1 - z0) * t
    cx = c0[0] + (c1[0] - c0[0]) * t; cy = c0[1] + (c1[1] - c0[1]) * t
    cover = max(ow / src.width, oh / src.height)
    sw, sh = ow / (cover * z), oh / (cover * z)
    x0 = clamp(cx * src.width - sw / 2, 0, src.width - sw)
    y0 = clamp(cy * src.height - sh / 2, 0, src.height - sh)
    im = src.transform((ow, oh), Image.EXTENT, (x0, y0, x0 + sw, y0 + sh), Image.BICUBIC)
    return to_f(im)


def light_leak(base, t, t0, dur=1.0, cx=0.8, cy=0.2, strength=1.0):
    p = (t - t0) / dur
    if p < 0 or p > 1:
        return
    k = math.sin(p * math.pi) ** 2 * strength
    x = cx + (p - .5) * 0.6
    d = np.sqrt(((xx - x) * 1.2) ** 2 + ((yy - cy) * 0.8) ** 2)
    g = np.exp(-d ** 2 / 0.12)
    base += (g * k)[..., None] * np.array([1.0, 0.62, 0.28], np.float32)
    base += k * 0.18 * np.array([1.0, 0.85, 0.6], np.float32)


def shimmer(base, L, core, cx, cy, p, width=0.12, k=0.9):
    """Additive diagonal highlight band across logo core alpha."""
    if p <= 0 or p >= 1:
        return
    x0 = int(cx - L.w / 2); y0 = int(cy - L.h / 2)
    h, w = core.shape
    gx = np.arange(w, dtype=np.float32)[None, :] / w
    gy = np.arange(h, dtype=np.float32)[:, None] / h
    pos = p * 1.6 - 0.3
    band = np.exp(-((gx + gy * 0.25 - pos) / width) ** 2)
    add = (band * core * k)[..., None] * np.array([1.0, 0.95, 0.85], np.float32)
    by0, bx0 = max(0, y0), max(0, x0)
    by1, bx1 = min(H, y0 + h), min(W, x0 + w)
    base[by0:by1, bx0:bx1] += add[by0 - y0:by1 - y0, bx0 - x0:bx1 - x0]


def gold_line(base, cy, cx, half_len, thick=2, op=1.0):
    if half_len < 1 or op <= 0:
        return
    x0, x1 = int(max(0, cx - half_len)), int(min(W, cx + half_len))
    xs = np.linspace(-1, 1, x1 - x0, dtype=np.float32)
    fadeedge = np.clip(1 - np.abs(xs) ** 6, 0, 1)
    reg = base[cy:cy + thick, x0:x1]
    reg += (GOLD_MID * 1.15 - reg) * (fadeedge * op)[None, :, None]


def diamond(base, cx, cy, r, op=1.0):
    if r < 1 or op <= 0:
        return
    s = int(r) + 2
    g = np.arange(-s, s + 1, dtype=np.float32)
    m = np.clip(r - (np.abs(g)[None, :] + np.abs(g)[:, None]) + 0.5, 0, 1) * op
    reg = base[cy - s:cy + s + 1, cx - s:cx + s + 1]
    reg += (GOLD_TOP - reg) * m[..., None]


def frame_rect(base, x0, y0, x1, y1, op, thick=3, inset=14):
    if op <= 0:
        return
    c = GOLD_MID * 1.2
    for (a, b, c2, d, th) in [(x0, y0, x1, y1, thick), (x0 + inset, y0 + inset, x1 - inset, y1 - inset, 1)]:
        a, b, c2, d = int(a), int(b), int(c2), int(d)
        for sl in [base[b:b + th, a:c2], base[d - th:d, a:c2], base[b:d, a:a + th], base[b:d, c2 - th:c2]]:
            sl += (c - sl) * (op * (1.0 if th > 1 else 0.6))


# ---------- scenes ----------
S1_END, S2_END, S3_START = 4.6, 11.6, 11.2
CARD_DUR = 2.6
S3_END = S3_START + 4 * CARD_DUR  # 21.6
S4_END = 25.4


def scene_intro(t):
    f = EMERALD.copy()
    particles(f, t, eout(prog(t, 0, 1.5)))
    cx, cy = W / 2, 820
    # lines expand
    # logo reveal: wipe + rise + scale
    p = prog(t, 0.5, 2.2)
    if p > 0:
        L = scale_layer(LOGO_BIG, 1.08 - 0.08 * eout(p))
        composite(f, L, cx, cy + 30 * (1 - eout(p)), eout(p), wipe_mask(L, eio(p), 0.25))
        if abs(L.w - LOGO_BIG.w) < 2:
            shimmer(f, LOGO_BIG, LOGO_BIG_CORE, cx, cy, prog(t, 2.2, 3.4))
    composite(f, T_TOSC, W / 2, 1100 + 20 * (1 - eout(prog(t, 1.9, 2.8))), eout(prog(t, 1.9, 2.8)))
    return f


def scene_hero(t):
    lt = t - S1_END + 0.6
    p = prog(t, S1_END - 0.6, S2_END)
    f = kenburns(HERO, eio(p) * 0.85 + p * 0.15, 1.0, 1.18, (0.5, 0.42), (0.55, 0.52))
    # sun glow pulsing (sun at upper-left of crop)
    sx, sy = 0.05, 0.27
    d = np.sqrt(((xx - sx) * 1.0) ** 2 + ((yy - sy) * 0.56) ** 2)
    f += (np.exp(-d ** 2 / 0.03) * (0.35 + 0.1 * math.sin(lt * 2)))[..., None] * np.array([1, .75, .4], np.float32)
    # top & bottom gradient for text
    topg = np.clip(1 - yy / 0.42, 0, 1) ** 1.4 * 0.75
    botg = 0
    f *= (1 - topg - botg)[..., None]
    f *= VIGN
    particles(f, t, 0.6)
    # headline
    def word(L, x, y, t0, mask_wipe=False):
        q = prog(t, t0, t0 + 0.9)
        if q <= 0:
            return
        o = eout(q) * (1 - eio(prog(t, 7.9, 8.4)))
        if mask_wipe:
            composite(f, L, x, y, o, wipe_mask(L, eio(q), 0.3))
        else:
            composite(f, L, x, y + 50 * (1 - eout(q)), o)
    word(T_UNLOC, 120 + T_UNLOC.w / 2 - 60, 250, 5.2)
    word(T_CARETE, 120 + T_CARETE.w / 2 - 60, 420, 5.7)
    word(T_GASESTE, W - 90 - T_GASESTE.w / 2 + 60, 590, 6.3, True)
    # paragraph
    for i, L in enumerate(T_PARA):
        q = prog(t, 8.3 + i * 0.35, 9.2 + i * 0.35)
        o = eout(q) * (1 - eio(prog(t, S2_END - 0.7, S2_END - 0.1)))
        composite(f, L, W / 2, 170 + i * 80 + 30 * (1 - eout(q)), o)
    gold_line(f, 405, W // 2, 200 * eio(prog(t, 9.0, 9.8)), 2, 1 - eio(prog(t, S2_END - 0.7, S2_END - 0.1)))
    diamond(f, W // 2, 406, 7 * eoutback(prog(t, 9.4, 9.7)) * (1 - eio(prog(t, S2_END - 0.7, S2_END - 0.1))))
    for i, L in enumerate([T_PARA2, T_PARA3]):
        q = prog(t, 9.4 + i * 0.4, 10.2 + i * 0.4)
        o = eout(q) * (1 - eio(prog(t, S2_END - 0.7, S2_END - 0.1)))
        composite(f, L, W / 2, 465 + i * 56, o)
    return f


def scene_card(t, i):
    c = card_data[i]
    t0 = S3_START + i * CARD_DUR
    lt = (t - t0 + 0.4) / CARD_DUR  # starts during incoming crossfade
    f = c['bg'] * (1.0 + 0.04 * math.sin(t))
    f = f.copy()
    particles(f, t, 0.8)
    # frame entrance
    q = eout(prog(lt, 0.0, 0.3))
    fw, fh = FRAME_W, int(FRAME_W * c['big'].height / c['big'].width)
    fh = min(fh, 1000)
    cy = 820 + 70 * (1 - q)
    x0, y0 = (W - fw) // 2, int(cy - fh / 2)
    img = kenburns(c['big'], clamp(lt / 1.15), 1.04, 1.16, (0.45, 0.5) if i % 2 else (0.55, 0.5), (0.55, 0.45) if i % 2 else (0.45, 0.5), out=(fw, fh))
    # reveal image with vertical curtain
    rp = eio(prog(lt, 0.03, 0.33))
    cut = int(fh * rp)
    if cut > 0:
        top = (fh - cut) // 2
        y0c, y1c = max(0, y0 + top), min(H, y0 + top + cut)
        f[y0c:y1c, x0:x0 + fw] = img[y0c - y0:y1c - y0]
    frame_rect(f, x0 - 22, y0 - 22, x0 + fw + 22, y0 + fh + 22, q)
    composite(f, T_NUM[i], W / 2, y0 - 90, eout(prog(lt, 0.1, 0.35)))
    # title letter wipe + subtitle
    tq = prog(lt, 0.18, 0.5)
    ty = y0 + fh + 140
    composite(f, c['T'], W / 2, ty + 30 * (1 - eout(tq)), eout(tq), wipe_mask(c['T'], eio(tq), 0.3))
    gold_line(f, int(ty + 75), W // 2, 160 * eio(prog(lt, 0.3, 0.55)), 2)
    diamond(f, W // 2, int(ty + 76), 7 * eoutback(prog(lt, 0.42, 0.55)))
    sq = prog(lt, 0.35, 0.6)
    composite(f, c['S'], W / 2, ty + 140 + 20 * (1 - eout(sq)), eout(sq))
    f *= VIGN
    return f


def scene_mosaic(t):
    lt = t - S3_END + 0.4
    f = EMERALD.copy()
    particles(f, t, 0.9)
    q = prog(lt, 0.0, 0.8)
    composite(f, T_EXP, W / 2, 330 + 30 * (1 - eout(q)), eout(q), wipe_mask(T_EXP, eio(q), 0.3))
    tw, th = 450, 520
    pos = [(W / 2 - 240, 760), (W / 2 + 240, 760), (W / 2 - 240, 1310), (W / 2 + 240, 1310)]
    for i, (cx, cy) in enumerate(pos):
        cq = prog(lt, 0.15 + i * 0.18, 0.85 + i * 0.18)
        if cq <= 0:
            continue
        s = 0.7 + 0.3 * eoutback(cq)
        w, h = int(tw * s), int(th * s)
        img = kenburns(card_data[i]['big'], clamp(lt / 4), 1.0, 1.12, (0.5, 0.5), (0.5, 0.45), out=(w, h))
        x0, y0 = int(cx - w / 2), int(cy - h / 2 + 60 * (1 - eout(cq)))
        o = eout(cq)
        f[y0:y0 + h, x0:x0 + w] = f[y0:y0 + h, x0:x0 + w] * (1 - o) + img * o
        frame_rect(f, x0 - 8, y0 - 8, x0 + w + 8, y0 + h + 8, o, 2, 0)
        lab = card_data[i]['title']
    composite(f, T_TOSC, W / 2, 1700 + 20 * (1 - eout(prog(lt, 1.4, 2.2))), eout(prog(lt, 1.4, 2.2)))
    f *= VIGN
    return f


def scene_end(t):
    lt = t - S4_END
    f = EMERALD.copy()
    particles(f, t, 1.0)
    vq = eout(prog(lt, 0.2, 1.6))
    composite(f, VINE_L, VINE_L.w / 2 - 40, H - VINE_L.h / 2 + 30 + 80 * (1 - vq), vq * 0.8, wipe_mask(VINE_L, eio(vq), 0.4))
    composite(f, VINE_R, W - VINE_R.w / 2 + 40, VINE_R.h / 2 - 20 - 80 * (1 - vq), vq * 0.55, wipe_mask(VINE_R, eio(vq), 0.4, True))
    cx, cy = W / 2, 560
    p = prog(lt, 0.3, 1.6)
    composite(f, LOGO_END, cx, cy + 30 * (1 - eout(p)), eout(p), wipe_mask(LOGO_END, eio(p), 0.25))
    shimmer(f, LOGO_END, LOGO_END_CORE, cx, cy, prog(lt, 1.7, 2.8))
    shimmer(f, LOGO_END, LOGO_END_CORE, cx, cy, prog(lt, 4.6, 5.7))
    q = prog(lt, 1.0, 1.9)
    composite(f, T_TOSC, W / 2, 850 + 20 * (1 - eout(q)), eout(q))
    gold_line(f, 930, W // 2, 300 * eio(prog(lt, 1.3, 2.2)), 2)
    diamond(f, W // 2, 931, 9 * eoutback(prog(lt, 1.9, 2.3)))
    q = prog(lt, 1.7, 2.6)
    composite(f, T_WEB, W / 2, 1020 + 20 * (1 - eout(q)), eout(q))
    q = prog(lt, 2.2, 3.0)
    s = 0.85 + 0.15 * eoutback(q)
    composite(f, scale_layer(QR, s), W / 2, 1300, eout(q))
    frame_rect(f, W / 2 - 162 * s - 14, 1300 - 162 * s - 14, W / 2 + 162 * s + 14, 1300 + 162 * s + 14, eout(q), 2, 0)
    composite(f, T_DESC, W / 2, 1530, eout(prog(lt, 2.6, 3.4)))
    q = eout(prog(lt, 3.0, 3.8))
    composite(f, T_DISC1, W / 2, 1790, q * 0.9)
    composite(f, T_DISC2, W / 2, 1830, q * 0.9)
    f *= VIGN
    return f


def blend(a, b, k):
    return a * (1 - k) + b * k


GRAIN = np.random.default_rng(3).normal(0, 1, (4, H // 2, W // 2)).astype(np.float32)


def render(i):
    t = i / FPS
    if t < S1_END - 0.6:
        f = scene_intro(t)
    elif t < S1_END:
        k = eio(prog(t, S1_END - 0.6, S1_END))
        f = blend(scene_intro(t), scene_hero(t), k)
    elif t < S3_START:
        f = scene_hero(t)
    elif t < S3_END:
        ci = int((t - S3_START) // CARD_DUR)
        lt = (t - S3_START) - ci * CARD_DUR
        if ci == 0 and t < S2_END:
            f = blend(scene_hero(t), scene_card(t, 0), eio(prog(t, S3_START, S2_END)))
        elif lt > CARD_DUR - 0.4 and ci < 3:
            f = blend(scene_card(t, ci), scene_card(t, ci + 1), eio(prog(lt, CARD_DUR - 0.4, CARD_DUR)))
        else:
            f = scene_card(t, ci)
        if lt > CARD_DUR - 0.4 and ci == 3:
            f = blend(f, scene_mosaic(t), eio(prog(lt, CARD_DUR - 0.4, CARD_DUR)))
    elif t < S4_END:
        if t > S4_END - 0.5:
            f = blend(scene_mosaic(t), scene_end(t), eio(prog(t, S4_END - 0.5, S4_END)))
        else:
            f = scene_mosaic(t)
    else:
        f = scene_end(t)
    # transitions: light leaks
    light_leak(f, t, S1_END - 0.9, 1.2, 0.85, 0.25, 0.9)
    light_leak(f, t, S2_END - 0.8, 1.1, 0.2, 0.6, 0.6)
    light_leak(f, t, S3_END - 0.6, 1.0, 0.7, 0.4, 0.6)
    # global fades
    f *= eio(prog(t, 0, 0.6)) * (1 - eio(prog(t, DUR - 0.8, DUR)))
    # grain
    g = GRAIN[i % 4]
    g = np.repeat(np.repeat(g, 2, 0), 2, 1)
    f += g[..., None] * 0.012
    return (np.clip(f, 0, 1) * 255).astype(np.uint8).tobytes()


if __name__ == '__main__':
    if PREVIEW:
        for t in [float(x) for x in PREVIEW.split(',')]:
            fr = np.frombuffer(render(int(t * FPS)), np.uint8).reshape(H, W, 3)
            Image.fromarray(fr).resize((540, 960)).save(os.path.join(D, f'prev_{t:05.1f}.png'))
        sys.exit()
    out = os.path.join(D, 'video_noaudio.mp4')
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    with Pool(4) as pool:
        for n, b in enumerate(pool.imap(render, range(NF), chunksize=4)):
            p.stdin.write(b)
            if n % 60 == 0:
                print(n, flush=True)
    p.stdin.close(); p.wait()
    print('done', out)
