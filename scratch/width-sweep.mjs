/** Width sweep — runs the clip audit at 320 / 360 / 768 across all pages. */
import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:3000';
const PAGES = [
    '/business', '/match-cut', '/text-highlighter', '/watermark', '/compressor',
    '/resizer', '/quote-card', '/text-behind', '/bouquet', '/palette-extractor',
    '/sync-slate', '/color-gradient', '/carousel-slicer', '/background-replace',
    '/auto-captions', '/thumbnail-lab', '/invoice', '/receipt', '/teleprompter',
    '/video-grabber', '/',
];
const WIDTHS = Number(process.argv[2]) ? [Number(process.argv[2])] : [320, 360, 768];

const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
});

let bad = false;
for (const W of WIDTHS) {
    console.log(`\n===== WIDTH ${W}px =====`);
    for (const path of PAGES) {
        const page = await browser.newPage();
        await page.setViewport({ width: W, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
        let err = null;
        try {
            await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await new Promise((r) => setTimeout(r, 2500));
        } catch (e) { err = String(e).slice(0, 80); }
        let offenders = [];
        try {
            offenders = await page.evaluate(() => {
                const vw = window.innerWidth;
                const anc = (el) => {
                    let n = el.parentElement;
                    while (n && n !== document.body) {
                        const cs = getComputedStyle(n);
                        if (cs.position === 'fixed') return true;
                        if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return true;
                        if (parseFloat(cs.opacity) === 0 || cs.visibility === 'hidden') return true;
                        n = n.parentElement;
                    }
                    return false;
                };
                const out = [];
                for (const el of document.querySelectorAll('*')) {
                    const cs = getComputedStyle(el);
                    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
                    const r = el.getBoundingClientRect();
                    if (r.right <= vw + 1 || r.width < 40) continue;
                    if (anc(el)) continue;
                    if (el.childElementCount > 2) continue;
                    out.push(`<${el.tagName.toLowerCase()} .${(el.getAttribute('class') || '').slice(0, 40)}> +${Math.round(r.right - vw)}px "${(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)}"`);
                }
                out.sort((a, b) => parseInt(b.match(/\+(\d+)px/)[1]) - parseInt(a.match(/\+(\d+)px/)[1]));
                return out.slice(0, 3);
            });
        } catch (e) { err = String(e).slice(0, 80); }

        if (err) { bad = true; console.log(`❌ ${path} [ERR ${err}]`); }
        else if (offenders.length) { bad = true; console.log(`❌ ${path}`); offenders.forEach((o) => console.log(`   ${o}`)); }
        else console.log(`✅ ${path}`);
        await page.close();
    }
}
await browser.close();
console.log(bad ? '\nSWEEP: ISSUES FOUND' : '\nSWEEP: ALL CLEAN');
