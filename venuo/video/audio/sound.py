"""Venuo film soundtrack: original music + sound effects synthesised from scratch (no samples, no licences needed),
mixed under the ElevenLabs voice-over. Timings mirror the scene windows in film.src.html.

python3 sound.py  ->  music.wav, sfx.wav, mix.wav (voice + music + sfx, before loudness normalisation)
"""
import subprocess, wave
import numpy as np

def movavg(x, w):
    c = np.cumsum(np.insert(x, 0, 0.0)); y = (c[w:] - c[:-w]) / w
    return np.pad(y, (w // 2, len(x) - len(y) - w // 2), mode='edge')

SR = 44100
DUR = 55.5
VO_OFFSET = 0.6
N = int(SR * (DUR + 0.5))
rng = np.random.default_rng(7)

# scene starts (video time) — keep in sync with film.src.html
S1, S2, S3, S4, S5, S6, S7, S8, S9, S10 = 0, 5.75, 13.0, 17.8, 22.75, 27.55, 32.55, 37.0, 41.4, 47.9

# ---------------------------------------------------------------- helpers
def tt(d): return np.arange(int(SR * d)) / SR
def buf(): return np.zeros((N, 2))

def place(b, sig, t, gain=1.0, pan=0.0):
    """Add mono or stereo signal at time t (seconds)."""
    i = int(t * SR)
    if i >= N: return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    n = min(len(sig), N - i)
    b[i:i + n] += sig[:n] * gain

def fftfilt(x, lo=None, hi=None, slope=1.5):
    """Smooth band filter in the frequency domain (works on mono or stereo)."""
    X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** (2 * slope))
    if hi: m *= 1 / (1 + (f / hi) ** (2 * slope))
    if x.ndim == 2: m = m[:, None]
    return np.fft.irfft(X * m, n=len(x), axis=0)

def conv(x, ir):
    n = len(x) + len(ir) - 1; L = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)]

def reverb(x, decay=2.2, mix=0.25, seed=1):
    r = np.random.default_rng(seed); n = int(SR * decay)
    out = np.zeros_like(x)
    for ch in range(2):
        ir = r.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.9 / decay)
        ir = fftfilt(ir, lo=200, hi=6000); ir /= np.sqrt((ir ** 2).sum())
        out[:, ch] = conv(x[:, ch], ir)
    return x * (1 - mix) + out * mix

def expdec(d, k): return np.exp(-tt(d) * k)
def saw(f, d, harm=10, detune=0.0):
    t = tt(d); s = np.zeros_like(t)
    for k in range(1, harm + 1):
        if f * k > 16000: break
        s += np.sin(2 * np.pi * f * (1 + detune) * k * t) / k ** 1.3
    return s
def note(n):  # MIDI -> Hz
    return 440 * 2 ** ((n - 69) / 12)
def fade(sig, a=0.01, r=0.05):
    n = len(sig); e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return sig * e

# ---------------------------------------------------------------- instruments / sfx voices
def kick():
    t = tt(.45); f = 45 + 110 * np.exp(-t * 28)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    return s + fftfilt(rng.standard_normal(len(t)) * np.exp(-t * 120), lo=1500) * .3
def snare():
    t = tt(.3); n = fftfilt(rng.standard_normal(len(t)), lo=1200, hi=7000) * np.exp(-t * 16)
    return n * .8 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * .4
def hat(dec=55):
    t = tt(.12); return fftfilt(rng.standard_normal(len(t)), lo=7500) * np.exp(-t * dec)
def pluck(f, d=.45):
    t = tt(d); s = saw(f, d, harm=8) * np.exp(-t * 9)
    return fade(s, .003, .05)
def pad(freqs, d, a=.8, r=1.2):
    s = sum(saw(f, d, 8, dt) for f in freqs for dt in (-.004, 0, .004)) / (3 * len(freqs))
    return fade(s, a, r)
def boom(d=2.2, f0=58):
    t = tt(d); f = f0 * (0.6 + 0.4 * np.exp(-t * 3))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    s += fftfilt(rng.standard_normal(len(t)), hi=900) * np.exp(-t * 9) * .7
    return s
def slam():
    t = tt(1.0)
    s = boom(1.0, 70) * .9 + fftfilt(rng.standard_normal(len(t)), lo=800, hi=6000) * np.exp(-t * 30) * .6
    s += np.sin(2 * np.pi * 140 * t) * np.exp(-t * 12) * .4
    return s
def whoosh(d=.7, up=True, lo=400, hi=5000):
    n = int(SR * d); x = rng.standard_normal(n); out = np.zeros(n); ch = 2048
    for i in range(0, n, ch):
        p = i / n; c = lo * (hi / lo) ** (p if up else 1 - p)
        seg = x[i:i + ch]; out[i:i + ch] = fftfilt(seg, lo=c * .6, hi=c * 1.6)
    env = np.sin(np.linspace(0, np.pi, n)) ** 2
    return out * env
def ping(f=1318.5):
    t = tt(.5)
    a = np.sin(2 * np.pi * f * t) * np.exp(-t * 14)
    b = np.zeros_like(t); k = int(.07 * SR); b[k:] = np.sin(2 * np.pi * f * 1.335 * t[:-k]) * np.exp(-t[:-k] * 10)
    return fade(a * .7 + b, .002, .05)
def pop(f=620):
    t = tt(.12); fr = f * (1 + .6 * (1 - np.exp(-t * 60)))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 35)
def tick(f=2400, d=.03):
    t = tt(d); return np.sin(2 * np.pi * f * t) * np.exp(-t * 180) + fftfilt(rng.standard_normal(len(t)), lo=4000) * np.exp(-t * 300) * .4
def buzz(d=.55):
    t = tt(d); s = np.sign(np.sin(2 * np.pi * 150 * t)) * .6 + np.sin(2 * np.pi * 300 * t) * .3
    gate = (np.sin(2 * np.pi * 7 * t) > -.2).astype(float)
    return fftfilt(s * gate, hi=1400) * fade(np.ones_like(t), .02, .08)
def glitch(d=.25):
    n = int(SR * d); s = np.zeros(n); i = 0
    while i < n:
        L = int(rng.uniform(.008, .04) * SR); m = min(L, n - i); seg = np.arange(m) / SR
        kind = rng.integers(3)
        if kind == 0: s[i:i + m] = np.sign(np.sin(2 * np.pi * rng.uniform(300, 3000) * seg))
        elif kind == 1: s[i:i + m] = rng.standard_normal(m)
        i += L
    s = np.round(s * 6) / 6
    return s * .5
def chime(f):
    t = tt(1.6)
    return sum(np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) * a for m, k, a in [(1, 3, 1), (2.76, 6, .4), (5.4, 10, .2), (2, 4, .3)])
def shimmer(d=2.5):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f in (1046.5, 1318.5, 1568, 2093, 2637))
    return s * np.exp(-t * 1.6) * (0.75 + .25 * np.sin(2 * np.pi * 6 * t)) / 5

# ---------------------------------------------------------------- music
music = buf()
# A+B · tension (0 → 12.65): low drone, ticking clock, heartbeat, riser
dr_end = 12.65
d = tt(dr_end)
drone = (np.sin(2 * np.pi * 55 * d) * .5 + saw(110, dr_end, 6) * .25 + saw(164.81, dr_end, 6) * .15 + saw(130.81, dr_end, 6) * .12)
drone *= np.clip(d / 2.0, 0, 1) * (0.55 + 0.45 * np.clip((d - S2) / 6, 0, 1))
drone = fftfilt(drone, hi=900)
place(music, fade(drone, .01, .03), 0, .55)
clus = (saw(116.54, dr_end - S2, 6) + saw(233.08, dr_end - S2, 6) * .5) * np.linspace(0, 1, int((dr_end - S2) * SR)) ** 2
place(music, fade(fftfilt(clus, hi=1500), .01, .03), S2, .22)
t = .4
while t < dr_end - .1:   # clock ticks, accelerating in the chaos
    place(music, tick(2000 if int(t * 4) % 2 else 2600), t, .35 + .25 * (t > S2), pan=-.2)
    gap = .5 if t < S2 else max(.11, .5 - (t - S2) * .065)
    t += gap
t = 1.0
while t < dr_end - .2:   # heartbeat
    place(music, kick() * .9, t, .5); place(music, kick() * .6, t + .22, .4)
    t += 1.15 if t < S2 else max(.55, 1.15 - (t - S2) * .1)
rs = dr_end - S2; tr = tt(rs)   # riser
riser = np.sin(2 * np.pi * np.cumsum(220 * 4 ** (tr / rs)) / SR) * (tr / rs) ** 2.2 * .35
riser += whoosh(rs, True, 300, 7000) * (tr / rs) ** 2 * 1.2
place(music, fade(riser, .5, .02), S2, .5)
place(music, whoosh(.7, True, 800, 9000)[::-1] * 1.5, dr_end - .7, .6)   # reverse suck into the blackout

# C · groove (13.0 → end), 110 BPM, Am – F – C – G
beat = 60 / 110; bar = beat * 4
CH = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [60, 64, 67]), (55, [55, 59, 62])]
start, end = S3, S10 + 0.05
nb = int(np.ceil((end - start) / bar))
for b_i in range(nb):
    t0 = start + b_i * bar
    root, tones = CH[b_i % 4]
    full = t0 >= S4 - .01
    lift = t0 >= S9 - .01
    place(music, pad([note(n) for n in tones] + ([note(tones[0] + 12)] if lift else []), bar + .9, .5, .9), t0, .5 if full else .38)
    place(music, fftfilt(saw(note(root - 24), bar * .95, 5), hi=400) * fade(np.ones(int(bar * .95 * SR)), .01, .2), t0, .5 if full else .0)
    arp = [tones[0] + 12, tones[1] + 12, tones[2] + 12, tones[1] + 12]
    for k in range(8):
        f = note(arp[k % 4] + (12 if (lift and k % 4 == 3) else 0))
        place(music, pluck(f), t0 + k * beat / 2, .16 if full else .11, pan=(-.35 if k % 2 else .35))
    if full:
        for k in range(4):
            place(music, kick(), t0 + k * beat, .7 if k in (0, 2) else .45)
            if k in (1, 3): place(music, snare(), t0 + k * beat, .32)
        for k in range(8 if not lift else 16):
            step = beat / 2 if not lift else beat / 4
            place(music, hat(55 if k % 2 else 80), t0 + k * step, .16, pan=.4)
# outro: final chord swell and shimmer
od = DUR - S10 + .4
place(music, pad([note(n) for n in (48, 55, 60, 64, 67, 72)], od, .05, 3.0), S10, .6)
place(music, fftfilt(saw(note(36), od, 5), hi=300) * fade(np.ones(int(od * SR)), .01, 3), S10, .45)
music = reverb(music, 2.6, .22, seed=3)

# ---------------------------------------------------------------- sfx
sfx = buf()
place(sfx, boom(2.5, 50), 0.05, .55)
place(sfx, whoosh(.6, True), 0.25, .35)
for i, d0 in enumerate((2.0, 2.3, 2.6)): place(sfx, pop(560 + 80 * i), d0, .45, pan=(i - 1) * .3)
t = 3.2
while t < 4.3: place(sfx, tick(3200, .02), t, .22); t += .045 + (t - 3.2) * .05   # guest counter
# chaos
for d0 in (.1, .6, 1.1, 1.8, 2.6): place(sfx, whoosh(.35, False, 300, 3000), S2 + d0, .35, pan=-.4); place(sfx, boom(.4, 90) * .5, S2 + d0 + .15, .25)
for i in range(18):
    d0 = 1.2 + 3.6 * (i / 18) ** .62
    place(sfx, ping([1174.7, 1318.5, 1568, 1396.9][i % 4]), S2 + d0, .28 + .1 * (i / 18), pan=float(rng.uniform(-.6, .6)))
for k, d0 in enumerate((.2, 1.35, 2.85)): place(sfx, slam(), S2 + d0, .55 + .1 * k)
place(sfx, slam() * 1.2, S2 + 4.6, .85); place(sfx, boom(2.0, 42), S2 + 4.6, .6)
t = S2 + 2.9
while t < S2 + 6.2: place(sfx, buzz(), t, .3, pan=.5); t += .85
place(sfx, glitch(.15), S2 + 2.85, .35); place(sfx, glitch(.25), S2 + 4.6, .5)
place(sfx, glitch(.75) * np.linspace(.3, 1.2, int(.75 * SR)), S2 + 6.1, .6)
# reveal
place(sfx, boom(3.0, 46), S3 + .15, .9); place(sfx, shimmer(3.0), S3 + .15, .5)
place(sfx, whoosh(.8, True, 500, 8000), S3 + .55, .35)
# scene transitions
for s0 in (S4, S5, S6, S7, S8, S9, S10): place(sfx, whoosh(.55, True, 400, 6000), s0 - .25, .3, pan=float(rng.uniform(-.3, .3)))
place(sfx, pop(700), S4 + 2.7, .45)
place(sfx, tick(1800, .04), S5 + 1.0, .35); place(sfx, pop(640), S5 + 1.1, .4)
place(sfx, whoosh(.4, True, 600, 5000), S5 + 1.85, .3); place(sfx, whoosh(.25, True, 2000, 9000), S5 + 2.6, .25)
for k in range(10): place(sfx, tick(2800 + k * 60, .02), S5 + 2.6 + k * .1, .25)
place(sfx, chime(note(84)), S5 + 3.7, .25)
place(sfx, pop(560), S6 + 1.5, .4, pan=-.4); place(sfx, pop(680), S6 + 1.8, .4, pan=.4)
for d0, pn in ((1.7, -.4), (1.95, .4), (2.2, -.4)): place(sfx, whoosh(.7, True, 900, 7000), S6 + d0, .25, pan=pn); place(sfx, ping(1568), S6 + d0 + .7, .25, pan=pn)
place(sfx, whoosh(.5, False, 400, 4000), S6 + 3.6, .3)
place(sfx, whoosh(.6, True, 400, 5000), S7 + 1.8, .35)
place(sfx, whoosh(.35, True, 1500, 9000), S7 + 3.4, .35); place(sfx, pop(880), S7 + 3.55, .45)
place(sfx, pop(620), S8 + 2.8, .4)
for k, d0 in enumerate((.15, 1.55, 3.25)): place(sfx, chime(note(76 + 3 * k + (k > 1))), S9 + d0, .32)
place(sfx, boom(3.0, 48), S10 + .1, .8); place(sfx, shimmer(3.5), S10 + .1, .45)
place(sfx, whoosh(.6, True, 600, 8000), S10 + .35, .3); place(sfx, pop(760), S10 + 2.2, .5)
sfx = reverb(sfx, 1.4, .18, seed=5)

# ---------------------------------------------------------------- voice + ducking + mix
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'vo.mp3', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
vo = np.frombuffer(raw, np.int16).astype(np.float64) / 32768
vo_b = buf(); place(vo_b, vo, VO_OFFSET, 1.0)
env = np.abs(vo_b[:, 0]); w = int(.25 * SR)
env = movavg(env, w); env = np.clip(env / (env.max() * .25), 0, 1)
duck = 1 - .62 * env

def norm(x, peak): return x / (np.abs(x).max() + 1e-9) * peak
music = norm(music, .5) * duck[:, None]
sfx = norm(sfx, .55)
mix = vo_b * .95 + music * .62 + sfx * .7
tail = int(1.2 * SR); mix[int(DUR * SR) - tail:int(DUR * SR)] *= np.linspace(1, 0, tail)[:, None] ** 1.5
mix[int(DUR * SR):] = 0
mix = mix[:int(DUR * SR)]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)   # gentle soft-clip

def write(name, x):
    x = np.clip(x, -1, 1); d = (x * 32767).astype(np.int16)
    with wave.open(name, 'wb') as f: f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(d.tobytes())
write('music.wav', norm(music[:int(DUR * SR)], .9)); write('sfx.wav', norm(sfx[:int(DUR * SR)], .9)); write('mix.wav', mix)
print('ok', mix.shape[0] / SR)
