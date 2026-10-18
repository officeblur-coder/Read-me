#!/usr/bin/env bash
# Builds the promo package for a plain static host (cPanel public_html):
#   showcase-dist/aplicatie-comenzi-restaurant/   landing page + screenshots
#   showcase-dist/aplicatie-comenzi-restaurant/app/   the client app in demo mode (no backend)
# and zips it. Upload the folder into public_html.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=showcase-dist/aplicatie-comenzi-restaurant
rm -rf showcase-dist && mkdir -p "$OUT"
(cd app && npx vite build --mode demo --outDir dist-demo >/dev/null)
cp -r app/dist-demo "$OUT/app"
# the demo copy of the menu should not compete with the real one in search
sed -i 's|<head>|<head>\n    <meta name="robots" content="noindex">|' "$OUT/app/index.html"
cp showcase/index.html "$OUT/"
cp -r showcase/img "$OUT/img"
(cd showcase-dist && zip -qr aplicatie-comenzi-restaurant.zip aplicatie-comenzi-restaurant && tar -czf aplicatie-comenzi-restaurant.tar.gz aplicatie-comenzi-restaurant)
du -sh "$OUT" showcase-dist/*.zip showcase-dist/*.tar.gz
