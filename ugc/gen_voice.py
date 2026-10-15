# Generates voice.mp3 + timeline.json (sentence/word timings + mouth envelope) with edge-tts.
import ssl, json, asyncio, subprocess, struct, edge_tts.communicate as c
c._SSL_CTX = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
VOICE = "en-US-AvaNeural"
LINES = [
    ("Hey guys! I'm Mia.", "wave"),
    ("Welcome to my little corner of the internet.", "open"),
    ("I make videos about skincare, travel, and everyday glow ups.", "count"),
    ("Honest reviews, zero filter, and only stuff I actually love.", "heart"),
    ("So if you're a brand looking for content that actually converts,", "point"),
    ("let's create something amazing together.", "clasp"),
    ("Follow for more, and I'll see you in the next one. Bye!", "bye"),
]
GAP, LEAD, TOTAL, SR = 0.35, 0.6, 30.0, 24000

async def synth(text, i):
    com = c.Communicate(text, VOICE, rate="+4%", pitch="+2Hz", boundary="WordBoundary")
    audio, words = b"", []
    async for ch in com.stream():
        if ch["type"] == "audio": audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            words.append({"t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7, "w": ch["text"]})
    open(f"_l{i}.mp3", "wb").write(audio)
    return words

def pcm(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    return list(struct.unpack(f"<{len(raw)//2}h", raw))

async def main():
    samples, lines, t = [0] * int(LEAD * SR), [], LEAD
    for i, (text, gesture) in enumerate(LINES):
        words = await synth(text, i)
        s = pcm(f"_l{i}.mp3")
        dur = len(s) / SR
        lines.append({"start": round(t, 3), "end": round(t + dur, 3), "text": text, "gesture": gesture,
                      "words": [{"t": round(t + w["t"], 3), "d": round(w["d"], 3), "w": w["w"]} for w in words]})
        samples += s + [0] * int(GAP * SR); t += dur + GAP
    print("speech ends at", round(t, 2))
    samples += [0] * max(0, int(TOTAL * SR) - len(samples)); samples = samples[:int(TOTAL * SR)]
    open("_all.raw", "wb").write(struct.pack(f"<{len(samples)}h", *samples))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "_all.raw",
                    "-b:a", "96k", "voice.mp3"], check=True)
    fps, hop = 30, SR // 30
    env = [(sum(x * x for x in samples[k:k + hop]) / hop) ** .5 for k in range(0, len(samples), hop)]
    peak = sorted(env)[int(len(env) * .97)] or 1
    env = [round(min(1, e / peak), 2) for e in env]
    json.dump({"duration": TOTAL, "fps": fps, "lines": lines, "env": env}, open("timeline.json", "w"))

asyncio.run(main())
