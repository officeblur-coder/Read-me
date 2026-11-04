"""Self-hosted satellite raster tiles (z9-13) for the map region.
Source: EOxCloudless 2016 (CC BY 4.0) – same imagery as before, but as an XYZ pyramid
instead of one large image, so it drapes reliably on the 3D terrain on every device.
Output: public/map/sat/{z}/{x}/{y}.jpg
"""
import io, json, math, os, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'map', 'sat')
W, S, E, N = 12.02, 47.06, 12.86, 47.40
def txy(lon, lat, z):
    n = 2 ** z; return (lon + 180) / 360 * n, (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
def fetch(job):
    z, x, y = job
    p = os.path.join(OUT, str(z), str(x)); os.makedirs(p, exist_ok=True)
    f = os.path.join(p, f'{y}.jpg')
    if os.path.exists(f): return
    for i in range(4):
        try:
            d = urllib.request.urlopen(urllib.request.Request(f'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg', headers={'User-Agent': 'KitzAlpenSiteBuild/1.0'}), timeout=40).read()
            Image.open(io.BytesIO(d)).convert('RGB').save(f, quality=80, optimize=True, progressive=True); return
        except Exception:
            time.sleep(2 ** i)
    raise RuntimeError(job)
jobs = []
for z in range(9, 14):
    a, b = map(math.floor, txy(W, N, z)); c, d = map(math.floor, txy(E, S, z))
    jobs += [(z, x, y) for x in range(a, c + 1) for y in range(b, d + 1)]
print(len(jobs), 'tiles')
with ThreadPoolExecutor(6) as ex: list(ex.map(fetch, jobs))
json.dump({'bounds': [W, S, E, N], 'minzoom': 9, 'maxzoom': 13}, open(os.path.join(OUT, '..', 'sat.json'), 'w'))
