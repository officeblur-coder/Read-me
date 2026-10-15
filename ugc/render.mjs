// node render.mjs [out.mp4] [stills=1,5.5]  — renders mia.html frame by frame, muxes voice.mp3
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
const out = process.argv[2] || 'mia-ugc.mp4', stills = process.argv[3];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.error('PAGE ERROR', e));
await p.goto('file://' + path.resolve('mia.html') + '?render=1');
const { dur, fps } = await p.evaluate(async () => { await Promise.race([STAGE.ready, new Promise(r => setTimeout(r, 4000))]); return { dur: STAGE.duration, fps: STAGE.fps }; });
const grab = async t => { await p.evaluate(t => STAGE.render(t), t); return p.screenshot({ type: 'jpeg', quality: 93 }); };
if (stills) {
  for (const t of stills.split(',').map(Number)) fs.writeFileSync(`still_${t}.jpg`, await grab(t));
} else {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-i', 'voice.mp3',
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++) { if (!ff.stdin.write(await grab(i / fps))) await new Promise(r => ff.stdin.once('drain', r)); if (i % 150 === 0) console.log('frame', i, '/', n); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await b.close();
