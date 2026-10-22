# Generează texturile (ceață, grain) și încorporează layerele în film.html
import base64, json, pathlib
import numpy as np, cv2
from PIL import Image
d = pathlib.Path(__file__).parent; L = d / 'layers'
rng = np.random.default_rng(7)
if not (L / 'fog.png').exists():
    W, H = 1080, 1920; f = np.zeros((H, W), np.float32)
    for s, a in [(6, 1), (12, .55), (24, .3), (48, .15)]:
        n = rng.random((H // (W // s) + 2, s + 1)).astype(np.float32); n[:, -1] = n[:, 0]  # tileabil orizontal
        f += a * cv2.resize(n, (W + W // s, H + W // s), interpolation=cv2.INTER_CUBIC)[:H, :W]
    f = cv2.GaussianBlur(f, (0, 0), 30)
    f = np.clip((f - f.mean()) / f.std() * .5 + .3, 0, 1) ** 1.8
    f *= np.linspace(.35, 1, H)[:, None]  # mai densă jos
    rgb = np.dstack([f * 255, f * 150, f * 80]).clip(0, 255).astype(np.uint8)
    Image.fromarray(rgb).save(L / 'fog.png')
    g = (rng.normal(128, 40, (1920 // 2 + 256, 1080 // 2 + 256))).clip(0, 255).astype(np.uint8)
    Image.fromarray(g).resize((1080 + 512, 1920 + 512), Image.NEAREST).save(L / 'grain.png')
meta = json.loads((L / 'layers.json').read_text())
uri = lambda p: f"data:image/{'jpeg' if p.suffix == '.jpg' else 'png'};base64," + base64.b64encode(p.read_bytes()).decode()
src = {k: uri(L / ('bg.jpg' if k == 'bg' else f'{k}.png')) for k in meta}
src['fog'] = uri(L / 'fog.png'); src['grain'] = uri(L / 'grain.png')
(d / 'film.html').write_text((d / 'film.src.html').read_text().replace('__LAYERS__', json.dumps(meta)).replace('__SRC__', json.dumps(src)))
