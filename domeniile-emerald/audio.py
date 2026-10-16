import numpy as np, wave, os
SR = 44100; DUR = 32.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(1)
L = np.zeros(N); R = np.zeros(N)

def hz(n):  # midi -> hz
    return 440 * 2 ** ((n - 69) / 12)

# pad: Am - F - C - G (8s each)
chords = [[45, 57, 60, 64, 69], [41, 57, 60, 65, 69], [48, 55, 60, 64, 67], [43, 55, 59, 62, 67]]
for ci, ch in enumerate(chords):
    t0 = ci * 8.0
    seg = (t >= t0 - 1.5) & (t < t0 + 9.5)
    tt = t[seg] - t0
    env = np.clip((tt + 1.5) / 2.5, 0, 1) * np.clip((9.5 - tt) / 2.5, 0, 1)
    env = env ** 1.5
    for k, n in enumerate(ch):
        for det, pan in [(-0.12, 0.3), (0.12, 0.7)]:
            f = hz(n) * 2 ** (det / 12)
            ph = rng.uniform(0, 6.28)
            s = np.sin(2 * np.pi * f * tt + ph) + 0.25 * np.sin(4 * np.pi * f * tt + ph) + 0.08 * np.sin(6 * np.pi * f * tt)
            amp = (0.05 if k == 0 else 0.032) * env * (1 + 0.15 * np.sin(2 * np.pi * 0.2 * tt + k))
            L[seg] += s * amp * (1 - pan); R[seg] += s * amp * pan

# soft pulse bass heartbeat from 4.5s
for b in np.arange(4.6, 30, 1.3):
    seg = (t >= b) & (t < b + 1.0); tt = t[seg] - b
    root = [45, 41, 48, 43][min(3, int(b // 8))] - 12
    s = np.sin(2 * np.pi * hz(root) * tt) * np.exp(-tt * 4) * 0.12
    L[seg] += s; R[seg] += s

def chime(at, notes, amp=0.09):
    for j, n in enumerate(notes):
        st = at + j * 0.09
        seg = (t >= st) & (t < st + 4); tt = t[seg] - st
        f = hz(n)
        s = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 3) + 0.2 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt * 6))
        s *= np.exp(-tt * 1.6) * np.clip(tt / 0.005, 0, 1) * amp
        pan = 0.3 + 0.4 * (j % 2)
        L[seg] += s * (1 - pan); R[seg] += s * pan

def whoosh(at, dur=1.4, amp=0.22):
    seg = (t >= at) & (t < at + dur); tt = t[seg] - at
    n = rng.normal(0, 1, seg.sum())
    # crude band-pass sweeping: moving average of varying length
    out = np.zeros_like(n); x = 0.0
    a = 0.02 + 0.25 * (tt / dur)
    for i in range(len(n)):
        x += a[i] * (n[i] - x); out[i] = x
    env = np.sin(np.pi * tt / dur) ** 2 * amp
    L[seg] += out * env; R[seg] += out[::-1] * env

chime(0.7, [81, 84, 88, 93])
chime(2.3, [88, 93], 0.06)
chime(6.4, [76, 81, 84], 0.06)
for k in range(4):
    chime(11.2 + 0.5 + k * 2.6, [[81, 88], [77, 84], [79, 84], [79, 86]][k], 0.07)
chime(22.0, [84, 88, 91], 0.06)
chime(25.8, [81, 84, 88, 93, 96])
for w in [3.9, 10.9, 21.1, 24.9]:
    whoosh(w)

# simple stereo reverb (feedback delays)
def reverb(x, delays, fb=0.45, mix=0.35):
    y = x.copy()
    for d in delays:
        n = int(SR * d); buf = x.copy()
        for _ in range(4):
            buf = np.concatenate([np.zeros(n), buf[:-n]]) * fb
            y += buf * mix / len(delays) * 2
    return y
L = reverb(L, [0.113, 0.197, 0.311]); R = reverb(R, [0.131, 0.223, 0.283])
fade = np.clip(t / 0.5, 0, 1) * np.clip((DUR - t) / 2.0, 0, 1)
L *= fade; R *= fade
m = max(np.abs(L).max(), np.abs(R).max()); L /= m / 0.85; R /= m / 0.85
data = (np.stack([L, R], 1) * 32767).astype(np.int16)
with wave.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'music.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print('ok')
