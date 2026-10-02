/**
 * Mobile viewport overflow audit (final).
 * Flags ONLY real, user-visible clipping:
 *  - skips elements inside overflow-x:auto/scroll strips (intended)
 *  - skips elements inside position:fixed bars (fixed bars manage their own scroll)
 *  - skips invisible subtrees (opacity 0 / visibility hidden export nodes)
 * Usage: node scratch/mobile-audit.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] || 'http://localhost:3000';
const PAGES = [
  '/business', '/match-cut', '/text-highlighter', '/watermark', '/compressor',
  '/resizer', '/quote-card', '/text-behind', '/bouquet', '/palette-extractor',
  '/sync-slate', '/color-gradient', '/carousel-slicer', '/background-replace',
  '/auto-captions', '/thumbnail-lab', '/invoice', '/receipt', '/teleprompter',
  '/video-grabber', '/',
];

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});

let anyBad = false;
for (const path of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  let err = null;
  try {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3000));
  } catch (e) { err = String(e).slice(0, 100); }

  let report = null;
  try {
    report = await page.evaluate(() => {
      const vw = window.innerWidth;
      const anc = (el) => {
        let n = el.parentElement;
        while (n && n !== document.body) {
          const cs = getComputedStyle(n);
          if (cs.position === 'fixed') return 'fixed';
          if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return 'strip';
          if (parseFloat(cs.opacity) === 0 || cs.visibility === 'hidden') return 'invisible';
          n = n.parentElement;
        }
        return null;
      };
      const offenders = [];
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.right <= vw + 1 || r.width < 40) continue;
        if (anc(el)) continue;
        if (el.childElementCount > 2) continue; // leaf-ish only
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute('class') || '').slice(0, 60),
          w: Math.round(r.width), over: Math.round(r.right - vw),
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        });
      }
      offenders.sort((a, b) => b.over - a.over);
      return { offenders: offenders.slice(0, 4) };
    });
  } catch (e) { err = String(e).slice(0, 100); }

  if (err) { console.log(`\n== ${path}  [LOAD ERROR: ${err}]`); anyBad = true; }
  else if (report.offenders.length === 0) console.log(`✅ ${path}`);
  else {
    anyBad = true;
    console.log(`\n❌ ${path}`);
    for (const o of report.offenders) console.log(`   → <${o.tag} .${o.cls}> w=${o.w} +${o.over}px "${o.text}"`);
  }
  await page.close();
}

await browser.close();
console.log(anyBad ? '\nRESULT: issues remain (see above)' : '\nRESULT: ALL PAGES CLEAN');
