// Renders promo.html to promo.mp4 (1080×1920, 30 fps), frame by frame.
// usage: node render.js [outDir] [fps] [from] [to]   (needs playwright + ffmpeg)
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
  const dur = await p.evaluate(() => window.DURATION);
  const from = +(process.argv[4] || 0), to = +(process.argv[5] || dur);
  const n = Math.round((to - from) * fps);
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => window.render(t), from + i / fps);
    await p.screenshot({ path: path.join(out, "frames", String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 });
    if (i % 150 === 0) console.log(`frame ${i}/${n}`);
  }
  await b.close();
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(out, "frames", "%05d.jpg"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(out, "promo.mp4")]);
  console.log("done", path.join(out, "promo.mp4"));
})();
