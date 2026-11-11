"""Builds the self-hosted map assets for the Explore-the-Alps map.

* Satellite mosaic: EOX Sentinel-2 cloudless 2016 (CC BY 4.0), WMTS EPSG:3857, zoom 13,
  stitched into one JPEG (max 4096 px wide so every phone GPU can hold the texture).
* Terrain: AWS Terrain Tiles (terrarium encoding), zoom 8-11, copied as tiles.
* Driving distance/time from the pension to each access point: OSRM (OpenStreetMap data).

Output: public/map/  (satellite.jpg, meta.json, dem/{z}/{x}/{y}.png, routes.json)
Run:    python3 scripts/build-map-assets.py
"""
import io, json, math, os, time, urllib.request
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'map')
BBOX = (12.04, 47.08, 12.84, 47.38)  # W, S, E, N – Krimml/Königsleiten → Zell am See, Weißsee → Pass Thurn
UA = {'User-Agent': 'KitzAlpenSiteBuild/1.0'}

def get(url):
    for i in range(4):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()
        except Exception:
            time.sleep(2 ** i)
    raise RuntimeError(url)

def tile_xy(lon, lat, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y

def tile_lonlat(x, y, z):
    n = 2 ** z
    lon = x / n * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    return lon, lat

os.makedirs(OUT, exist_ok=True)
W, S, E, N = BBOX

# ---- satellite mosaic
Z = 13
x0, y0 = map(math.floor, tile_xy(W, N, Z)); x1, y1 = map(math.floor, tile_xy(E, S, Z))
mosaic = Image.new('RGB', ((x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256))
for x in range(x0, x1 + 1):
    for y in range(y0, y1 + 1):
        img = Image.open(io.BytesIO(get(f'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{Z}/{y}/{x}.jpg')))
        mosaic.paste(img, ((x - x0) * 256, (y - y0) * 256))
w = min(4096, mosaic.width)
mosaic = mosaic.resize((w, round(mosaic.height * w / mosaic.width)), Image.LANCZOS)
mosaic.save(os.path.join(OUT, 'satellite.jpg'), quality=84, optimize=True, progressive=True)
tl = tile_lonlat(x0, y0, Z); br = tile_lonlat(x1 + 1, y1 + 1, Z)
meta = {'coordinates': [[tl[0], tl[1]], [br[0], tl[1]], [br[0], br[1]], [tl[0], br[1]]], 'bbox': BBOX, 'size': mosaic.size}

# ---- terrain tiles
dem = []
for z in range(8, 12):
    a, b = map(math.floor, tile_xy(W, N, z)); c, d = map(math.floor, tile_xy(E, S, z))
    for x in range(a, c + 1):
        for y in range(b, d + 1):
            p = os.path.join(OUT, 'dem', str(z), str(x)); os.makedirs(p, exist_ok=True)
            open(os.path.join(p, f'{y}.png'), 'wb').write(get(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'))
            dem.append(f'{z}/{x}/{y}')
meta['dem'] = {'minzoom': 8, 'maxzoom': 11, 'tiles': dem}
json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)
print('satellite', mosaic.size, 'dem tiles', len(dem))

# ---- driving routes (OSRM, OpenStreetMap)
src = os.path.join(os.path.dirname(__file__), '..', 'src', 'content', 'map-points.json')
pts = json.load(open(src))
home = pts['home']
routes = {}
for p in pts['points']:
    if not p.get('nav'): continue
    lon, lat = p['nav'][1], p['nav'][0]
    r = json.loads(get(f"https://router.project-osrm.org/route/v1/driving/{home[1]},{home[0]};{lon},{lat}?overview=false"))
    if r.get('code') == 'Ok':
        routes[p['id']] = {'km': round(r['routes'][0]['distance'] / 1000, 1), 'min': round(r['routes'][0]['duration'] / 60)}
    time.sleep(1.1)
json.dump(routes, open(os.path.join(OUT, 'routes.json'), 'w'), indent=1)
print('routes', routes)
