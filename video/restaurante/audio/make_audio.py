"""Music + sound effects for the restaurant ad (video/restaurante), synthesised from scratch (no samples, no licences), mixed under the voice-over.

    python3 audio/make_audio.py            -> audio/music.wav, audio/sfx.wav, audio/mix.wav

Effects are placed in animation time (promo.html) and mapped to video time with timing.json, like the frames.
"""
import json, wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
SR = 44100
MAP = json.loads((HERE.parent / "timing.json").read_text())
DUR = MAP["new"][-1]
N = int(DUR * SR)
rng = np.random.default_rng(7)

def T(orig):  # animation time -> video time
    return float(np.interp(orig, MAP["orig"], MAP["new"]))

def t_(d):
    return np.arange(int(d * SR)) / SR

def fft_filter(x, lo=0, hi=SR / 2):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi < SR / 2: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))

def sweep_filter(x, f0, f1, width=1.2, chunks=24):
    """band-pass whose centre glides f0 -> f1 (overlap-add of short filtered chunks)"""
    out = np.zeros(len(x)); L = len(x) // chunks * 2 or len(x); hop = L // 2
    win = np.hanning(L)
    for i, s in enumerate(range(0, max(1, len(x) - hop), hop)):
        seg = x[s:s + L]
        if len(seg) < 16: break
        c = f0 * (f1 / f0) ** (s / max(1, len(x) - L))
        y = fft_filter(seg * win[:len(seg)], c / (1 + width), c * (1 + width))
        out[s:s + len(seg)] += y
    return out

def env(n, a=0.005, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def reverb(x, secs=1.4, mix=0.25):
    ir = rng.standard_normal(int(secs * SR)) * np.exp(-np.arange(int(secs * SR)) / SR * 5 / secs)
    ir = fft_filter(ir, 200, 7000); ir /= np.sqrt((ir ** 2).sum())
    n = len(x) + len(ir)
    wet = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[:len(x)]
    return x * (1 - mix) + wet * mix * 3

def place(bus, sig, at, gain=1.0, pan=0.0):
    s = int(at * SR)
    if s >= len(bus) or s + len(sig) <= 0: return
    if s < 0: sig = sig[-s:]; s = 0
    e = min(len(bus), s + len(sig))
    l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    bus[s:e, 0] += sig[:e - s] * gain * l * 1.414
    bus[s:e, 1] += sig[:e - s] * gain * r * 1.414

# ---------------------------------------------------------------- instruments
def kick():
    t = t_(0.45); f = 45 + 110 * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
    click = fft_filter(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t / 0.004) * 0.3
    return np.tanh((body + click) * 1.6)

def clap():
    t = t_(0.35); n = rng.standard_normal(len(t))
    e = sum(np.exp(-np.maximum(t - o, 0) / 0.006) * (t >= o) for o in (0, 0.011, 0.022)) + 0.8 * np.exp(-np.maximum(t - 0.03, 0) / 0.09) * (t >= 0.03)
    return fft_filter(n * e, 900, 5000) * 0.9

def hat(d=0.045):
    t = t_(0.12); return fft_filter(rng.standard_normal(len(t)), 7000) * np.exp(-t / d) * 0.5

def saw(f, t, phase=0.0):
    return 2 * ((f * t + phase) % 1) - 1

NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)
# Am – F – C – G, one bar (2 s at 120 BPM) each
CHORDS = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
ROOTS = [45, 41, 36, 43]

def pad(chord, d):
    t = t_(d); x = np.zeros((len(t), 2))
    for n in chord:
        for k, det in enumerate((-0.12, -0.05, 0.05, 0.12)):
            ch = k % 2
            x[:, ch] += saw(NOTE(n + 12) * 2 ** (det / 12), t, rng.random())
    a = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.3).clip(0, 1)
    for ch in range(2): x[:, ch] = fft_filter(x[:, ch], 150, 2200) * a
    return x * 0.06

def bass(n, d):
    t = t_(d); f = NOTE(n)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t)
    return np.tanh(x * 1.4) * np.minimum(1, t / 0.005) * np.exp(-t / 0.22) * 0.55

def pluck(n, d=0.35):
    t = t_(d); f = NOTE(n)
    x = sum(np.sin(2 * np.pi * f * h * t) * (0.6 ** h) for h in range(1, 6))
    return x * np.exp(-t / 0.12) * 0.22

# ---------------------------------------------------------------- music
BPM = 120; BEAT = 60 / BPM
GROOVE = 5.42              # drums drop on "Dar dacă…"
BREAK = (25.25, 27.6)      # half-time feel under "Clienții tăi. Profitul tău.", then the end-card impact
music = np.zeros((N, 2))
# tense intro: dark pad + low pulse under the hook
intro = pad((45, 48, 52), GROOVE + 0.2)
place(music, intro[:, 0], 0, 0.9, -0.3); place(music, intro[:, 1], 0, 0.9, 0.3)
for i in range(int(GROOVE / BEAT)):
    place(music, bass(33, BEAT * 0.9), i * BEAT, 0.5)
bar = 0; t0 = GROOVE
while t0 < DUR:
    ch = CHORDS[bar % 4]; root = ROOTS[bar % 4]
    p = pad(ch, 2.05)
    place(music, p[:, 0], t0, 1, -0.5); place(music, p[:, 1], t0, 1, 0.5)
    for b in range(4):
        bt = t0 + b * BEAT
        if bt >= DUR: break
        brk = BREAK[0] <= bt < BREAK[1]
        if not brk or b in (0, 2): place(music, kick(), bt, 0.9 if not brk else 0.6)
        if not brk:
            if b in (1, 3): place(music, clap(), bt, 0.35, 0.1)
            place(music, hat(), bt + BEAT / 2, 0.22, 0.35)
            if t0 > 9.8: place(music, hat(0.02), bt + BEAT / 4 * 3, 0.1, -0.35)
            for e in (0, 0.5): place(music, bass(root + (12 if e and b % 2 else 0), BEAT / 2), bt + e * BEAT, 0.8)
        if t0 > 9.8 and not brk:
            arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24]
            for s in range(2): place(music, pluck(arp[(b * 2 + s) % 4]), bt + s * BEAT / 2, 1, (-0.4, 0.4)[s])
    t0 += 4 * BEAT; bar += 1
t = np.arange(N) / SR
ph = ((t - GROOVE) % BEAT); pump = np.where(t >= GROOVE, 1 - 0.55 * np.exp(-ph / 0.11), 1)
music *= pump[:, None]
fade = np.clip((DUR - t) / 1.4, 0, 1); music *= fade[:, None]

# ---------------------------------------------------------------- sound effects
def whoosh(d=0.6, f0=300, f1=3000, rise=0.6):
    n = int(d * SR); x = rng.standard_normal(n)
    tt = np.arange(n) / n; e = np.where(tt < rise, (tt / rise) ** 2, ((1 - tt) / (1 - rise)) ** 1.5)
    return sweep_filter(x, f0, f1) * e * 0.9

def pop(f=520):
    tt = t_(0.14); f_ = f * (1 + 1.4 * np.exp(-tt / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f_) / SR) * env(len(tt), 0.001, 0.045) * 0.9

def tap():
    tt = t_(0.05); return (np.sin(2 * np.pi * 1900 * tt) * 0.5 + fft_filter(rng.standard_normal(len(tt)), 2000, 9000) * 0.5) * np.exp(-tt / 0.008)

def bell(f, d=0.9, g=1.0):
    tt = t_(d)
    return sum(np.sin(2 * np.pi * f * r * tt) * a * np.exp(-tt / (d * k)) for r, a, k in ((1, 1, .35), (2.01, .45, .2), (3.02, .2, .12), (4.2, .1, .08))) * g * 0.5

def ding():
    x = np.zeros(int(0.9 * SR)); a = bell(1318.5, .7); b = bell(1975.5, .8)
    x[:len(a)] += a; s = int(0.09 * SR); x[s:s + len(b)] += b[:len(x) - s]; return x

def success():
    x = np.zeros(int(1.2 * SR))
    for i, f in enumerate((1046.5, 1318.5, 1568, 2093)):
        b = bell(f, .9, .8); s = int(i * 0.07 * SR); x[s:s + len(b)] += b[:len(x) - s]
    return x

def ringer():   # the reception console's alarm: two bright bursts
    x = np.zeros(int(1.1 * SR)); tt = t_(0.16)
    tone = (np.abs(saw(880, tt)) * 2 - 1) * 0.5 + (np.abs(saw(1320, tt)) * 2 - 1) * 0.35
    burst = tone * np.minimum(1, tt / 0.004) * np.minimum(1, (0.16 - tt) / 0.02)
    for s in (0, 0.2, 0.55, 0.75): i = int(s * SR); x[i:i + len(burst)] += burst
    return x * 0.6

def sparkle(d=1.0, n=26):
    x = np.zeros(int(d * SR))
    for _ in range(n):
        f = rng.uniform(2500, 7000); b = bell(f, .25, rng.uniform(.15, .4)); s = int(rng.uniform(0, d - .25) * SR); x[s:s + len(b)] += b
    return x

def tick():
    tt = t_(0.03); return np.sin(2 * np.pi * 2600 * tt) * np.exp(-tt / 0.006) * 0.5

def impact(big=1.0):
    tt = t_(2.2); f = 28 + 70 * np.exp(-tt / 0.08)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.55)
    crack = fft_filter(rng.standard_normal(len(tt)), 100, 4000) * np.exp(-tt / 0.09) * 0.6
    return np.tanh((sub + crack) * 1.5) * big

def riser(d=2.0):
    n = int(d * SR); tt = np.arange(n) / SR
    tone = np.sin(2 * np.pi * np.cumsum(220 * (8 ** (tt / d))) / SR) * 0.25
    noise = sweep_filter(rng.standard_normal(n), 400, 6000, chunks=30) * 0.7
    return (tone + noise) * (tt / d) ** 2.2

def scratch():  # swipe for the strike-through
    return whoosh(0.32, 1500, 6000, 0.3) * 0.8

sfx = np.zeros((N, 2))
P = lambda sig, at, g=1.0, pan=0.0: place(sfx, sig, at, g, pan)
# 1 · hook: receipt slides in, -30% / commission chips, coins drained
P(whoosh(0.8, 200, 2200), 0.05, 0.7)
P(pop(300), 1.65, 0.8, -0.4); P(scratch(), 1.6, 0.5, -0.4)
P(pop(260), 2.0, 0.6); P(pop(330), 2.25, 0.8, 0.4)
P(impact(0.7), 3.45, 0.9)
for i in range(14): P(tick(), 3.5 + i * 0.06, 0.6, rng.uniform(-.6, .6))
for i in range(6): P(pop(900 - i * 90), 3.55 + i * 0.12, 0.25, rng.uniform(-.5, .5))
place(sfx, riser(1.3), 5.42 - 1.3, 0.5)
P(whoosh(0.4, 2500, 400, 0.3), 5.0, 0.6)
# 2 · your own app
P(pop(440), 5.6, 0.9); P(sparkle(0.7, 12), 5.7, 0.4)
P(whoosh(0.6, 2500, 300, 0.3), 7.3, 0.5)
P(whoosh(0.8, 200, 2600), 7.3, 0.8, 0.1); P(impact(0.45), 7.65, 0.7); P(sparkle(0.9, 20), 8.2, 0.35)
# 3 · menu, photos, order
P(whoosh(2.0, 400, 1400, 0.5), 9.9, 0.35)
P(pop(520), 10.98, 0.7, -0.5); P(pop(620), 11.18, 0.7, 0.5)
P(whoosh(0.4, 2000, 600, 0.3), 12.1, 0.4)
P(whoosh(0.5, 300, 2500), 12.2, 0.5)
P(tap(), 13.4, 1.0); P(pop(700), 13.42, 0.4)
P(success(), 13.62, 0.8); P(sparkle(1.4, 40), 13.62, 0.55)
P(whoosh(0.5, 400, 3000), 14.4, 0.6, -0.5)
# 4 · kitchen
P(whoosh(0.8, 200, 2000), 14.6, 0.6)
P(pop(500), 14.98, 0.6)
P(ringer(), 15.1, 0.8); P(ringer(), 16.0, 0.6)
P(tap(), 16.8, 1.0)
P(impact(0.45), 16.98, 0.8); P(success(), 17.0, 0.8)
# 5a · 0%
place(sfx, riser(0.9), 18.1 - 0.9, 0.45)
P(impact(1.0), 18.1, 1.0)
for i in range(10): P(tick(), 18.1 + 0.45 * (i / 10) ** 0.7, 0.45)
P(pop(420), 18.78, 0.6)
# 5b · loyalty
P(whoosh(0.8, 250, 2400), 19.85, 0.7, -0.3)
P(sparkle(1.0, 18), 20.45, 0.45)
for i in range(22): P(tick(), 20.2 + 1.3 * (i / 22) ** 0.6, 0.35)
for i in range(3): P(pop(560 + i * 90), 20.62 + i * 0.32, 0.6, (i - 1) * 0.5)
# 5c · zones
P(whoosh(0.7, 300, 2500), 22.6, 0.6, 0.3)
P(pop(380), 22.85, 0.7)
P(whoosh(0.9, 600, 1800, 0.5), 22.95, 0.35); P(whoosh(1.0, 500, 1600, 0.5), 23.6, 0.3)
P(pop(640), 23.78, 0.7, -0.3); P(pop(540), 24.48, 0.7, 0.3); P(ding(), 24.5, 0.5)
# 6 · yours
P(whoosh(0.5, 400, 3000), 25.25, 0.7, -0.6); P(impact(0.5), 25.4, 0.7)
P(whoosh(0.5, 400, 3000), 26.35, 0.7, 0.6); P(impact(0.6), 26.48, 0.8)
P(success(), 27.0, 0.6)
# 7 · end card
place(sfx, riser(1.6), 29.48 - 1.6, 0.5)
P(whoosh(0.8, 200, 2600), 27.65, 0.6)
P(impact(1.0), 29.48, 1.0); P(sparkle(1.4, 34), 29.5, 0.5)
P(pop(480), 30.2, 0.5)
sfx = np.stack([reverb(sfx[:, 0], 1.2, .18), reverb(sfx[:, 1], 1.25, .18)], 1)

# ---------------------------------------------------------------- voice + mix
def load(path, af="anull"):
    import subprocess
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-af", af, "-ac", "2", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).reshape(-1, 2).astype(float) / 32768

vo = np.zeros((N, 2)); # voice polish: rumble cut, even level, a little presence so it sits on top of the music
v = load(HERE / "vo.mp3", "highpass=f=90,equalizer=f=220:t=q:w=1:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.5,"
         "acompressor=threshold=-22dB:ratio=3:attack=5:release=90:makeup=2")[:N]; vo[:len(v)] = v
# the music ducks under the voice
lvl = np.sqrt(np.convolve(vo.mean(1) ** 2, np.ones(2205) / 2205, "same"))
duck = 1 - 0.6 * np.clip(lvl / 0.05, 0, 1)
duck = np.convolve(duck, np.ones(4410) / 4410, "same")
def norm(x, peak): return x / (np.abs(x).max() + 1e-9) * peak
music_n = norm(music, 0.5); sfx_n = norm(sfx, 0.6); vo_n = norm(vo, 0.9)
mix = vo_n * 1.0 + music_n * duck[:, None] * 0.55 + sfx_n * 0.7
mix = np.tanh(mix * 1.1) / np.tanh(1.1)

def save(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
save(HERE / "music.wav", music_n); save(HERE / "sfx.wav", sfx_n); save(HERE / "mix.wav", mix)
print("ok", DUR, "s")
