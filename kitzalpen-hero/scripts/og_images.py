"""Share images (WhatsApp, Facebook, LinkedIn): 1200x630 JPG, well under 300 KB, one per page type."""
import os
from PIL import Image, ImageOps
PUB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images') + '/'
SRC = {  # share name -> (source photo, vertical focus)
    'home': ('hero/winter-d.jpg', 0.55), 'pension': ('hero/summer-d.jpg', 0.45), 'rooms': ('rooms/room-1.jpg', 0.5),
    'room-double': ('rooms/room-1.jpg', 0.5), 'room-triple': ('rooms/room-2.jpg', 0.5), 'room-family': ('rooms/room-3.jpg', 0.5), 'room-quad': ('rooms/room-4.jpg', 0.5),
    'chalet': ('chalet/winter.jpg', 0.5), 'restaurant': ('restaurant/hall.jpg', 0.5), 'groups': ('groups/grossglockner.webp', 0.5),
    'mountain': ('real/kitzski-gondola-couple.webp', 0.5), 'ski': ('real/ski-panorama.webp', 0.5), 'summer': ('real/panoramabahn-summer.webp', 0.5),
    'explore': ('real/kitzsteinhorn-aerial.webp', 0.5), 'tours': ('real/winter-walk.webp', 0.5), 'places': ('winter/town-kitzbuehel.webp', 0.5),
    'arrival': ('winter/town-mittersill.webp', 0.5),
}
os.makedirs(PUB + 'og', exist_ok=True)
for name, (src, fy) in SRC.items():
    im = ImageOps.exif_transpose(Image.open(PUB + src)).convert('RGB')
    w, h = im.size; r = 1200 / 630
    if w / h > r: nw = round(h * r); x = (w - nw) // 2; im = im.crop((x, 0, x + nw, h))
    else: nh = round(w / r); y = min(max(0, round(fy * h - nh / 2)), h - nh); im = im.crop((0, y, w, y + nh))
    im = im.resize((1200, 630), Image.LANCZOS)
    p = f'{PUB}og/{name}.jpg'
    for q in (82, 76, 70, 62):
        im.save(p, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(p) < 200_000: break
    print(name, os.path.getsize(p) // 1024, 'KB')
