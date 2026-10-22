# Sound design sintetizat (fără sample-uri): beat de club înăbușit, build-up, drop, impacturi, whoosh-uri, sclipiri.
import numpy as np, pathlib
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile
SR, DUR = 48000, 20.0
N = int(SR * DUR); rng = np.random.default_rng(3)
mix = np.zeros((N, 2)); verb_send = np.zeros((N, 2))
t_all = np.arange(N) / SR

def filt(x, kind, f, order=2):
    return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x, axis=0)
def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
def put(sig, at, gain=1., pan=0., send=.3):
    i = int(at * SR); sig = sig[:N - i]
    if sig.ndim == 1:
        sig = np.stack([sig * np.sqrt((1 - pan) / 2) * 1.414, sig * np.sqrt((1 + pan) / 2) * 1.414], 1)
    mix[i:i + len(sig)] += sig * gain; verb_send[i:i + len(sig)] += sig * gain * send
def noise(sec): return rng.standard_normal(int(sec * SR))
def sweep_bp(x, f0, f1, q=.25):
    # filtru trece-bandă în mișcare, pe blocuri
    out = np.zeros_like(x); B = 1024
    for s in range(0, len(x), B):
        k = s / len(x); f = f0 * (f1 / f0) ** k
        lo, hi = max(30, f * (1 - q)), min(SR / 2 - 100, f * (1 + q))
        out[s:s + B] = sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), x[s:s + B])
    return out

# --- dronă + vânt ---
d = np.zeros(N)
for f, a in [(55, .5), (82.4, .3), (110, .15), (164.8, .08), (41.2, .35)]:
    d += a * np.sin(2 * np.pi * f * t_all + 2 * np.sin(2 * np.pi * .13 * t_all))
d *= (.55 + .45 * np.sin(2 * np.pi * .07 * t_all)) * np.clip(t_all / 1.5, 0, 1) * np.clip((DUR - t_all) / 1.2, 0, 1)
put(np.stack([d, np.roll(d, 400)], 1) * .16, 0, send=.4)
w = sweep_bp(noise(DUR), 300, 900, .5) * (.6 + .4 * np.sin(2 * np.pi * .21 * t_all))
put(np.stack([w, np.roll(w, 2000)], 1) * .05 * np.clip(t_all / 2, 0, 1)[:, None] * np.clip((DUR - t_all), 0, 1)[:, None], 0, send=.6)

# --- fulger: pocnet + tunet ---
def thunder(at, g):
    crack = filt(noise(.25), 'highpass', 1500) * env(int(.25 * SR), .002, .05)
    rumble = filt(noise(3.5), 'lowpass', 160, 4) * env(int(3.5 * SR), .08, .9) * (1 + .6 * np.sin(np.linspace(0, 40, int(3.5 * SR))))
    put(crack, at, .5 * g, pan=-.3, send=.7); put(rumble * 1.4, at + .03, g, send=.5)
# stroboscop: pocnet scurt + aer
for at, g in [(.3, .25), (.42, .35), (12.69, .25), (12.93, .3)]:
    put(filt(noise(.3), 'highpass', 2500) * env(int(.3 * SR), .001, .04), at, .35 * g, pan=-.2, send=.7)

# --- clopot de miezul nopții (parțiale inarmonice) ---
def bell(at, f0, g, dec=3.5):
    n = int(6 * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for r, a, dd in [(.5, .6, 1.4), (1, 1, 1), (1.19, .5, .7), (1.56, .4, .5), (2, .35, .45), (2.51, .25, .3), (3.01, .15, .25)]:
        s += a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / (dec * dd))
    s *= np.minimum(1, t / .004)
    put(s * .18 * g, at, pan=.15, send=.8)
bell(9.8, 784, .3, 1.6)

# --- shimmer (strălucire) ---
def shimmer(at, g=1., f0=2600):
    n = int(2.2 * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for i in range(9):
        f = f0 * (1 + i * .37) * (1 + .002 * rng.standard_normal())
        s += np.sin(2 * np.pi * f * t + rng.random() * 6) * np.exp(-t / (.4 + .15 * i)) * (1 - np.exp(-t / (.01 + .03 * i)))
    put(np.stack([s, np.roll(s, 300)], 1) * .03 * g, at, send=.9)
for at, g in [(1.95, 1), (2.35, .7), (5.45, .7), (6.3, .8), (6.4, .6), (7.6, .6), (9.1, .5), (10.8, .5), (11.8, .5), (12.9, .6), (16.2, .5), (17.6, .6)]:
    shimmer(at, g)

# --- whoosh ---
def whoosh(at, dur, f0, f1, g, pan=0.):
    n = int(dur * SR); x = sweep_bp(noise(dur), f0, f1, .35)
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    put(x * e * g, at - dur * .6, pan=pan, send=.4)
for at, dur, f0, f1, g, p in [(1.95, .9, 400, 3000, .25, -.4), (5.4, .6, 600, 5000, .25, .4), (6.6, .9, 400, 3500, .25, 0),
                              (8.0, .7, 600, 4000, .18, -.5), (9.8, .7, 600, 3500, .15, 0)]:
    whoosh(at, dur, f0, f1, g, p)

# --- riser înainte de apariția artistului ---
n = int(1.4 * SR); t = np.arange(n) / SR
r = sweep_bp(noise(1.4), 300, 6000, .3) * (t / 1.4) ** 2.5 * .35
tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (t / 1.4 * 2)) / SR) * (t / 1.4) ** 3 * .12
put(r + tone, 2.2, send=.5)

# --- impacturi ---
def impact(at, g, sub=50):
    n = int(2.5 * SR); t = np.arange(n) / SR
    f = sub + 90 * np.exp(-t / .06)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .7)
    hitn = filt(noise(2.5), 'lowpass', 2500) * np.exp(-t / .12)
    s = np.tanh((s + .5 * hitn) * 1.6)
    put(s * .5 * g, at, send=.45)
impact(3.6, .8)
impact(4.95, .8, 45)
impact(13.18, .45, 55); impact(18.95, .9, 42)

# "braam" la titlu: acord de saw-uri filtrat
n = int(3 * SR); t = np.arange(n) / SR; s = np.zeros(n)
for f in [55, 55.4, 82.4, 110.3, 130.8, 164.8]:
    s += 2 * ((t * f) % 1) - 1
s = filt(s, 'lowpass', 700, 4) * np.minimum(1, t / .02) * np.exp(-t / 1.1)
put(np.tanh(s * .6) * .22, 4.95, send=.5)

# --- pensulă (brush swoosh) ---
n = int(.9 * SR); t = np.arange(n) / SR
b = sweep_bp(noise(.9), 1200, 5000, .5) * (1 + .8 * rng.standard_normal(n).clip(0)) * np.sin(np.pi * t / .9) ** 1.5


# --- snare roll accelerat în build-up ---
tt = 3.62
while tt < 4.9:
    n = int(.15 * SR); x = np.arange(n) / SR
    sn = (filt(noise(.15), 'bandpass', [1500, 6000]) * .7 + np.sin(2 * np.pi * 190 * x) * .5) * np.exp(-x / .05)
    put(sn * (.05 + .2 * (tt - 3.6) / 1.35), tt, pan=.1, send=.4)
    tt += max(.06, .24 * (1 - (tt - 3.6) / 1.4))

# --- tic-uri pentru dată ---
for at in [8.0, 8.23, 8.47]:
    n = int(.15 * SR); t = np.arange(n) / SR
    c = (np.sin(2 * np.pi * 1800 * t) + .5 * filt(noise(.15), 'highpass', 3000)) * np.exp(-t / .012)
    put(c * .2, at, pan=-.5, send=.5)

# --- groove dark (124 BPM) din momentul titlului ---
bpm = 124; beat = 60 / bpm; drop = 4.95; g0 = drop - 10 * beat; g1 = 18.95
open_lp = lambda tt: (260 + 900 * np.clip((tt - 1.5) / 2, 0, 1)) if tt < drop else 2500 + 6000 * np.clip((tt - drop) / 1.5, 0, 1)
groove = np.zeros((N, 2))
def gput(sig, at, gain, pan=0.):
    i = int(at * SR); sig = sig[:N - i]
    groove[i:i + len(sig), 0] += sig * gain * (1 - pan) ; groove[i:i + len(sig), 1] += sig * gain * (1 + pan)
k = 0
while g0 + k * beat < g1:
    at = g0 + k * beat
    n = int(.5 * SR); t = np.arange(n) / SR
    kick = np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-t / .035)) / SR) * np.exp(-t / .28)
    brk = 3.55 < at < drop - .01
    if brk: k += 1; continue
    gput(np.tanh(kick * 1.8) * .45 * (.7 if at < drop else 1), at, 1)
    # hat pe contratimp
    n2 = int(.08 * SR); hat = filt(noise(.08), 'highpass', 8000) * np.exp(-np.arange(n2) / SR / .018)
    gput(hat * .12, at + beat / 2, 1, pan=.3)
    if k % 2 == 1:
        n3 = int(.4 * SR); cl = sweep_bp(noise(.4), 1500, 1200, .4) * np.exp(-np.arange(n3) / SR / .08)
        gput(cl * .25, at, 1, pan=-.1)
        verb_send[int(at * SR):int(at * SR) + n3] += (cl * .25)[:, None] * .6
    # bas pe contratimp
    n4 = int(beat / 2 * SR); tb = np.arange(n4) / SR
    note = [55, 55, 65.4, 49][(k // 4) % 4]
    bs = filt(2 * ((tb * note) % 1) - 1, 'lowpass', 220, 4) * np.minimum(1, tb / .005) * np.exp(-tb / .12)
    gput(bs * .3, at + beat / 2, 1)
    # puls de arpegiu (sintetic, întunecat)
    for j, f in enumerate([220, 261.6, 329.6, 261.6]):
        n5 = int(beat / 4 * SR); tp = np.arange(n5) / SR
        pl = np.sign(np.sin(2 * np.pi * f * tp)) * np.exp(-tp / .06) * .04
        gput(pl, at + j * beat / 4, 1, pan=(-.4 if j % 2 else .4))
    k += 1
# filtru care se deschide (pe blocuri) + fade final
B = 2048
for s0 in range(int(g0 * SR), N, B):
    fc = open_lp(s0 / SR) if s0 / SR < 17.8 else max(250, 7300 * np.exp(-(s0 / SR - 17.8) * 3))
    groove[s0:s0 + B] = sosfilt(butter(2, fc, 'lowpass', fs=SR, output='sos'), groove[s0:s0 + B], axis=0)
groove *= (np.clip((g1 + .1 - t_all) / .8, 0, 1) * np.clip(t_all / .8, 0, 1))[:, None]
mix += groove * 1.4; verb_send += groove * .12

# --- reverb (IR de zgomot cu decădere exponențială, stereo) ---
ir_n = int(3.2 * SR); ti = np.arange(ir_n) / SR
irL = rng.standard_normal(ir_n) * np.exp(-ti / .75); irR = rng.standard_normal(ir_n) * np.exp(-ti / .75)
irL = filt(irL, 'lowpass', 6000); irR = filt(irR, 'lowpass', 6000)
vs = filt(verb_send, 'highpass', 150)
rev = np.stack([fftconvolve(vs[:, 0], irL)[:N], fftconvolve(vs[:, 1], irR)[:N]], 1) * .05
out = mix + rev
out = filt(out, 'highpass', 25)
out = np.tanh(out / np.max(np.abs(out)) * 1.4) * .89  # saturare blândă + limitare
out *= np.clip((DUR - t_all) / .25, 0, 1)[:, None]
wavfile.write(pathlib.Path(__file__).parent / 'sfx.wav', SR, (out * 32767).astype(np.int16))
print('ok', np.abs(out).max())
