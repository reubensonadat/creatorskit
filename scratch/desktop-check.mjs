/** Quick desktop regression check at 1280px for all pages. */
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox'],
});
const PAGES = ['/business', '/match-cut', '/text-highlighter', '/resizer', '/sync-slate', '/bouquet', '/'];
let bad = false;
for (const p of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    try {
        await page.goto('http://localhost:3000' + p, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise((r) => setTimeout(r, 2500));
        const n = await page.evaluate(() => {
          const vw = window.innerWidth;
          const inStrip = (el) => {
            let n = el.parentElement;
            while (n && n !== document.body) {
              const cs = getComputedStyle(n);
              if (cs.position === 'fixed') return true;
              if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return true;
              n = n.parentElement;
            }
            return false;
          };
          let count = 0;
          for (const el of document.querySelectorAll('*')) {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
            const r = el.getBoundingClientRect();
            if (r.right > vw + 1 && r.width > 60 && el.childElementCount <= 2 && !inStrip(el)) count++;
          }
          return count;
        });
        if (n > 0) { bad = true; console.log(`❌ ${p}: ${n} overflowing elements at 1280px`); }
        else console.log(`✅ ${p}`);
    } catch (e) { bad = true; console.log(`[ERR] ${p}: ${String(e).slice(0, 80)}`); }
    await page.close();
}
await browser.close();
console.log(bad ? 'DESKTOP ISSUES FOUND' : 'DESKTOP CLEAN');
