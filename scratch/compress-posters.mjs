/* Compress text-behind demo posters jpg -> webp (Edge canvas encoder).
 * Keeps originals (OG images still use the .jpg); app swap uses the .webp. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const DIR = 'public/assets/text-behind';
const FILES = ['demo-cruise-poster.jpg', 'demo-earth-poster.jpg', 'demo-portrait-poster.jpg', 'demo-egypt-poster.jpg'];
const MAXW = 800;
const Q = 0.85;

const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-first-run'] });
const p = await b.newPage();

let totalIn = 0;
let totalOut = 0;
for (const f of FILES) {
  const buf = fs.readFileSync(`${DIR}/${f}`);
  const b64 = buf.toString('base64');
  const out = await p.evaluate(async ({ b64, MAXW, Q }) => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + b64;
    await img.decode();
    const scale = Math.min(1, MAXW / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    const dataUrl = c.toDataURL('image/webp', Q);
    return { w, h, data: dataUrl.split(',')[1] };
  }, { b64, MAXW, Q });
  const webp = Buffer.from(out.data, 'base64');
  fs.writeFileSync(`${DIR}/${f.replace('.jpg', '.webp')}`, webp);
  totalIn += buf.length;
  totalOut += webp.length;
  console.log(`${f}  ${(buf.length / 1024).toFixed(0)}KB -> ${f.replace('.jpg', '.webp')}  ${(webp.length / 1024).toFixed(0)}KB  (${out.w}x${out.h})`);
}
await b.close();
console.log(`TOTAL ${(totalIn / 1024).toFixed(0)}KB -> ${(totalOut / 1024).toFixed(0)}KB  (-${Math.round((1 - totalOut / totalIn) * 100)}%)`);
