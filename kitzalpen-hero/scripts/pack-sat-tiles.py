"""Packs public/map/sat/{z}/{x}/{y}.jpg into one file (public/map/sat.pack + sat-index.json).
The map reads tiles from it through a MapLibre custom protocol – one download instead of 369 requests."""
import json, os
ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'map')
index, blob = {}, bytearray()
for z in sorted(os.listdir(os.path.join(ROOT, 'sat')), key=int):
    for x in sorted(os.listdir(os.path.join(ROOT, 'sat', z)), key=int):
        for f in sorted(os.listdir(os.path.join(ROOT, 'sat', z, x))):
            d = open(os.path.join(ROOT, 'sat', z, x, f), 'rb').read()
            index[f'{z}/{x}/{f[:-4]}'] = [len(blob), len(d)]; blob += d
open(os.path.join(ROOT, 'sat.pack'), 'wb').write(blob)
json.dump(index, open(os.path.join(ROOT, 'sat-index.json'), 'w'), separators=(',', ':'))
print(len(index), 'tiles,', len(blob) // 1024, 'KB')
