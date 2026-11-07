// Generează iconițele aplicației (app/public/icons) din social/app-icon.html. usage: node social/render-icons.js (+ python3 cu Pillow)
const { chromium } = require(process.env.PW || "playwright");
const path = require("path"), { execFileSync } = require("child_process");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  await p.goto("file://" + path.join(__dirname, "app-icon.html")); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const out = path.join(__dirname, "..", "app", "public", "icons");
  await p.screenshot({ path: path.join(out, "icon-1024.png") });
  await b.close();
  execFileSync("python3", ["-c", `
from PIL import Image
im = Image.open("${out}/icon-1024.png").convert("RGB")
for s, n in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png"), (48, "favicon-48.png")):
    im.resize((s, s), Image.LANCZOS).save("${out}/" + n, optimize=True)
`]);
  console.log("ok", out);
})();
