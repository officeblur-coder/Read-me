"""Final balance: voice + music.wav + sfx.wav (from sound.py) with per-section level automation and extra ducking.
python3 remix.py -> mix.wav"""
import subprocess, wave
import numpy as np

def movavg(x, w):
    c = np.cumsum(np.insert(x, 0, 0.0)); y = (c[w:] - c[:-w]) / w
    return np.pad(y, (w // 2, len(x) - len(y) - w // 2), mode='edge')

SR = 44100
DUR = 55.5
VO_OFFSET = 0.6
# (start, end, voice-to-background target in dB): drama in the chaos, clarity everywhere else
SECTIONS = [(0, 5.75, 8), (5.75, 13.0, 4), (13.0, 17.8, 7), (17.8, 47.9, 11), (47.9, 52.6, 8), (52.6, 55.5, -6)]

def rd(n):
    w = wave.open(n); return np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(float) / 32768
music, sfx = rd('music.wav'), rd('sfx.wav')
n = int(DUR * SR); music, sfx = music[:n], sfx[:n]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'vo.mp3', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
v = np.frombuffer(raw, np.int16).astype(float) / 32768
vo = np.zeros(n); i = int(VO_OFFSET * SR); vo[i:i + len(v)] = v[:n - i]

# extra ducking under the voice (fast attack, slower release)
env = np.abs(vo); w = int(.12 * SR); env = movavg(env, w)
env = np.clip(env / (np.percentile(env[env > 1e-4], 90) + 1e-9), 0, 1)
rel = int(.35 * SR); env = np.maximum(env, movavg(env, rel))
duck = 1 - .45 * env

bg = music * duck[:, None] * 1.0 + sfx * 0.9
rms = lambda x: np.sqrt((x ** 2).mean()) + 1e-9
gain = np.ones(n)
for a, b, target in SECTIONS:
    s, e = int(a * SR), int(b * SR)
    vseg = vo[s:e]; vr = rms(vseg[np.abs(vseg) > 1e-3]) if (np.abs(vseg) > 1e-3).any() else rms(vo[vo != 0])
    g = vr / (rms(bg[s:e].mean(1)) * 10 ** (target / 20))
    gain[s:e] = g
k = int(.4 * SR); gain = movavg(gain, k)   # smooth section changes
mix = vo[:, None] + bg * gain[:, None]
mix /= np.abs(mix).max() / .89
tail = int(1.2 * SR); mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 1.5
d = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open('mix.wav', 'wb') as f: f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(d.tobytes())
db = lambda x: 20 * np.log10(rms(x))
for a, b, _ in SECTIONS:
    s, e = int(a * SR), int(b * SR); vv = vo[s:e] / (np.abs(mix).max() and 1); bb = (mix[s:e].mean(1) - vo[s:e] * (mix[s:e].mean(1) @ vo[s:e] / ((vo[s:e] @ vo[s:e]) + 1e-9)))
    print(f'{a:5.2f}-{b:5.2f}  voice/background ≈ {db(vo[s:e][np.abs(vo[s:e]) > 1e-3]) - db((bg[s:e] * gain[s:e, None]).mean(1)) if (np.abs(vo[s:e]) > 1e-3).any() else float("nan"):5.1f} dB')
