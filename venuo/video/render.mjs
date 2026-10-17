// node render.mjs [out.mp4] [comma-separated still times]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
const fps = 30, out = process.argv[2] || 'venuo-film-9x16.mp4', stills = process.argv[3];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.error('pageerror', e.message));
await p.goto('file://' + path.resolve('film.html') + '?render=1');
const dur = await p.evaluate(async () => { await FILM.ready; return FILM.DURATION; });
// Screenshots instead of toDataURL: images loaded over file:// would taint the canvas.
const grab = async t => { await p.evaluate(t => FILM.renderFrame(t), t); return p.screenshot({ type: 'png' }); };
if (stills) {
  for (const t of stills.split(',').map(Number)) fs.writeFileSync(`still_${t}.png`, await grab(t));
} else {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++) { if (!ff.stdin.write(await grab(i / fps))) await new Promise(r => ff.stdin.once('drain', r)); if (i % 300 === 0) console.log('frame', i, '/', n); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await b.close();
