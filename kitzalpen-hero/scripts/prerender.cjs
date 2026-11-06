/**
 * Pre-render: saves every page in every language as static HTML in dist/ (dist/en/chalet/index.html …),
 * so search engines get the full text, title, description, canonical and hreflang without running JavaScript.
 * Also writes dist/sitemap.xml (with hreflang alternates) and dist/404.html.
 *
 * Run after `vite build`:  node scripts/prerender.cjs   (part of `npm run build`)
 * Needs Playwright with Chromium.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIST = path.join(__dirname, '..', 'dist');
const SITE = 'https://www.kitzalpen.at';
const PORT = 4179;
const BASE = `http://localhost:${PORT}`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  // 404: the empty shell (the app shows the start page), never indexed
  fs.writeFileSync(path.join(DIST, '404.html'), template.replace('<meta name="robots" content="index, follow" />', '<meta name="robots" content="noindex, follow" />'));

  const server = spawn(process.execPath, [path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/'); break; } catch { await wait(200); } }
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', locale: 'de-AT' });
    await ctx.addInitScript(() => { try { localStorage.setItem('kitzalpen-promo-closed', String(Date.now())); } catch { /* */ } });
    // live data is fetched again in the visitor's browser; keep it out of the saved pages
    await ctx.route(/api\.open-meteo\.com|panomax|feratel|openfreemap|3dvista|kitzbuhelalpenpension\.at/, (r) => r.abort());
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const paths = await page.evaluate(() => window.__kzPaths);
    if (!paths || !paths.length) throw new Error('no page list (window.__kzPaths)');

    const pages = [];
    for (const p of paths) {
      await page.goto(BASE + p, { waitUntil: 'networkidle' });
      const lang = p.split('/')[1].length === 2 ? p.split('/')[1] : 'de';
      await page.waitForFunction((l) => document.documentElement.lang === l && document.querySelector('link[rel="canonical"]'), lang, { timeout: 15000 });
      // walk down once so every section has rendered, then wait for the translation pass
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
      await wait(lang === 'de' || lang === 'en' ? 250 : 700);
      const html = await page.evaluate(() => {
        const doc = document.documentElement.cloneNode(true);
        // the app adds these again when it starts
        doc.classList.remove('js');
        doc.removeAttribute('style');
        doc.querySelectorAll('script[src*="maplibre"], link[href*="maplibre"], .maplibregl-map canvas').forEach((n) => n.remove());
        doc.querySelectorAll('body > *:not(#root):not(script)').forEach((n) => n.remove()); // portals, popups, tooltips
        doc.querySelector('body')?.removeAttribute('style');
        // animation states caught mid-way (opacity/visibility/transform set by GSAP) – show the final state
        doc.querySelectorAll('[class*="js-"][style]').forEach((n) => {
          const s = n.getAttribute('style').split(';').filter((d) => d.trim() && !/^\s*(opacity|visibility|transform|translate|scale|rotate)\s*:/.test(d)).join(';');
          if (s) n.setAttribute('style', s); else n.removeAttribute('style');
        });
        return '<!doctype html>\n' + doc.outerHTML;
      });
      const out = path.join(DIST, p, 'index.html');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, html);
      const alts = await page.evaluate(() => [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((a) => [a.hreflang, a.href]));
      const title = await page.title();
      pages.push({ p, alts, title });
      process.stdout.write(`${p}  ${title}\n`);
    }
    await browser.close();

    const day = new Date().toISOString().slice(0, 10);
    const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
    for (const { p, alts } of pages) {
      xml.push(`  <url>\n    <loc>${SITE}${p}</loc>\n    <lastmod>${day}</lastmod>`);
      for (const [hl, href] of alts) xml.push(`    <xhtml:link rel="alternate" hreflang="${hl}" href="${href}"/>`);
      xml.push('  </url>');
    }
    xml.push('</urlset>', '');
    fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml.join('\n'));

    const titles = new Map();
    for (const { p, title } of pages) titles.set(title, [...(titles.get(title) || []), p]);
    const dup = [...titles].filter(([, v]) => v.length > 1);
    console.log(`\n${pages.length} pages pre-rendered · sitemap.xml written`);
    if (dup.length) console.log('same title on several pages:', dup);
    if (errors.length) { console.error('page errors:', [...new Set(errors)]); process.exitCode = 1; }
  } finally {
    server.kill();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
