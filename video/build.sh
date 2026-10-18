#!/usr/bin/env bash
# Full promo build: frames -> silent video, synthesised music + sfx mixed under the voice-over, final mp4.
#   video/build.sh [outDir]      (needs node + playwright, python3 + numpy, ffmpeg; voice-over in audio/vo.mp3)
set -euo pipefail
cd "$(dirname "$0")"
OUT="${1:-out}"
node render.js "$OUT" 30
python3 audio/make_audio.py
ffmpeg -y -loglevel error -i "$OUT/promo-silent.mp4" -i audio/mix.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$OUT/promo.mp4"
echo "done $OUT/promo.mp4"
