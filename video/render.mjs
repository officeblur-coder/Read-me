import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import path from 'path';
const fps = 30, out = process.argv[2] || 'wrap-film.mp4', onlyStills = process.argv[3];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file://' + path.resolve('film.html') + '?render=1');
const dur = await p.evaluate(async () => { await FILM.ready; return FILM.DURATION; });
const grab = async t => Buffer.from((await p.evaluate(t => { FILM.renderFrame(t); return FILM.canvas.toDataURL('image/png').split(',')[1]; }, t)), 'base64');
if (onlyStills) {
  const fs = await import('fs');
  for (const t of onlyStills.split(',').map(Number)) fs.writeFileSync(`still_${t}.png`, await grab(t));
} else {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++) { if (!ff.stdin.write(await grab(i / fps))) await new Promise(r => ff.stdin.once('drain', r)); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await b.close();
