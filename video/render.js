// Renders promo.html to promo.mp4 (1080×1920, 30 fps), frame by frame.
// usage: node render.js [outDir] [fps]   (needs playwright + ffmpeg)
// timing.json maps animation time to video time so the scenes land on the voice-over lines.
const { chromium } = require(process.env.PW || "playwright");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const out = path.resolve(process.argv[2] || "out"), fps = +(process.argv[3] || 30);
(async () => {
  fs.rmSync(path.join(out, "frames"), { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "frames"), { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto("file://" + path.join(__dirname, "promo.html"));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const map = JSON.parse(fs.readFileSync(path.join(__dirname, "timing.json"), "utf8"));
  const toAnim = T => { const { orig: o, new: v } = map; let k = 1; while (k < v.length - 1 && T > v[k]) k++;
    return o[k - 1] + (o[k] - o[k - 1]) * Math.min(1, (T - v[k - 1]) / (v[k] - v[k - 1])); };
  const n = Math.round(map.new[map.new.length - 1] * fps);
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => window.render(t), toAnim(i / fps));
    await p.screenshot({ path: path.join(out, "frames", String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 });
    if (i % 150 === 0) console.log(`frame ${i}/${n}`);
  }
  await b.close();
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(out, "frames", "%05d.jpg"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(out, "promo-silent.mp4")]);
  console.log("done", path.join(out, "promo-silent.mp4"));
})();
