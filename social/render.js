// Randează machetele din folder în PNG (2160×2160, de 2× pentru calitate). usage: node social/render.js
const { chromium } = require(process.env.PW || "playwright");
const path = require("path"), fs = require("fs");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
  for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith(".html"))) {
    await p.goto("file://" + path.join(__dirname, f)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    const out = path.join(__dirname, "..", f.replace(".html", ".png")); await p.screenshot({ path: out }); console.log(out);
  }
  await b.close();
})();
