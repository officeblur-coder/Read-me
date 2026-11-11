import os, sys
from PIL import Image
SRC, OUT = sys.argv[1], sys.argv[2]
tot0 = tot1 = 0
for r, _, fs in os.walk(SRC):
    for f in sorted(fs):
        p = os.path.join(r, f); rel = os.path.relpath(p, SRC)
        try: im = Image.open(p); im.load()
        except Exception: continue          # bot-check pages, not images
        s0 = os.path.getsize(p); q = os.path.join(OUT, rel); os.makedirs(os.path.dirname(q), exist_ok=True)
        if f.lower().endswith('.jpg'):
            im = im.convert('RGB')
            if max(im.size) > 1600:
                k = 1600 / max(im.size); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            im.save(q, 'JPEG', quality=78, optimize=True, progressive=True)
        elif im.mode == 'RGBA' and s0 > 300_000:
            im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(q, 'PNG', optimize=True)
        else:
            im.save(q, 'PNG', optimize=True)
        s1 = os.path.getsize(q)
        if s1 >= s0 * 0.9: os.remove(q); continue   # not worth replacing
        tot0 += s0; tot1 += s1; print(f'{rel[:64]:64} {s0//1024:5} → {s1//1024:4} KB', im.size)
for r, ds, fs in os.walk(OUT, topdown=False):
    if not os.listdir(r): os.rmdir(r)
print(f'replaced: {tot0/1e6:.1f} MB → {tot1/1e6:.1f} MB')
