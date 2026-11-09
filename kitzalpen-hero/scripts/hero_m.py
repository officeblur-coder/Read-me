"""Phone hero: the whole house in the frame. The real photo is shown uncropped across the width;
above and below it the same photo continues, softly blurred (no generated content)."""
import os
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
SRC = '/tmp/claude-0/-home-user-Read-me/de11a589-1ee0-587f-b8e4-12a0eeb9cdb4/images/'
PUB = '/home/user/Read-me/kitzalpen-hero/public/images/hero/'
W, H = 941, 1672
def compose(n, box, house_cy, target_cy=0.40, feather=110):
    im = ImageOps.exif_transpose(Image.open(f'{SRC}{n}.jpg')).convert('RGB')
    iw, ih = im.size
    crop = im.crop((round(box[0] * iw), round(box[1] * ih), round(box[2] * iw), round(box[3] * ih)))
    fh = round(crop.height * W / crop.width)
    fg = crop.resize((W, fh), Image.LANCZOS)
    y = round(target_cy * H - house_cy * fh); y = max(min(y, H - fh), 0)
    # above / below: the photo's own top and bottom edge, stretched and blurred (sky above, ground below)
    bg = Image.new('RGB', (W, H))
    strip = max(8, round(fh * 0.06))
    if y > 0: bg.paste(fg.crop((0, 0, W, strip)).resize((W, y + feather), Image.BICUBIC).filter(ImageFilter.GaussianBlur(18)), (0, 0))
    if y + fh < H:
        b = H - (y + fh)
        part = fg.crop((0, fh - strip, W, fh))
        ext = part.resize((W, b + feather), Image.BICUBIC).filter(ImageFilter.GaussianBlur(36))
        # fade towards the strip's own average tone further down, so no streaks remain
        tone = Image.new('RGB', ext.size, part.resize((1, 1), Image.BOX).getpixel((0, 0)))
        g = Image.linear_gradient('L').resize(ext.size)
        ext = Image.composite(tone, ext, g.point(lambda v: round(v * 0.85)))
        bg.paste(ext, (0, y + fh - feather))
    y = round(target_cy * H - house_cy * fh); y = max(min(y, H - fh), 0)
    mask = Image.new('L', (W, fh), 255)
    for i in range(feather):
        a = round(255 * (i / feather) ** 1.4)
        if y > 0: mask.paste(a, (0, i, W, i + 1))
        if y + fh < H: mask.paste(a, (0, fh - 1 - i, W, fh - i))
    bg.paste(fg, (0, y), mask)
    return bg, (y + fh * 0) / H
def save(im, stem):
    for w in (640, 941):
        r = im if w == W else im.resize((w, round(H * w / W)), Image.LANCZOS)
        r.save(f'{PUB}{stem}-{w}.webp', 'WEBP', quality=82, method=6); r.save(f'{PUB}{stem}-{w}.avif', 'AVIF', quality=60)
    im.save(f'{PUB}{stem}.jpg', 'JPEG', quality=86, optimize=True, progressive=True)
    for f in (f'{PUB}{stem}.webp', f'{PUB}{stem}.avif'):
        if os.path.exists(f): im.save(f, f.rsplit('.', 1)[1].upper().replace('WEBP', 'WEBP'), **({'quality': 82} if f.endswith('webp') else {'quality': 60}))
w, _ = compose(191, (0.14, 0.0, 0.78, 1.0), house_cy=0.63, target_cy=0.30)
s, _ = compose(190, (0.20, 0.0, 1.0, 1.0), house_cy=0.37)
save(w, 'winter-m'); save(s, 'summer-m')
both = Image.new('RGB', (W * 2 + 20, H), 'white'); both.paste(s, (0, 0)); both.paste(w, (W + 20, 0))
both.resize((both.width // 2, H // 2)).save('/tmp/claude-0/-home-user-Read-me/de11a589-1ee0-587f-b8e4-12a0eeb9cdb4/scratchpad/hero-m-new.jpg', quality=85)
print('ok')
