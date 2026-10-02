/**
 * Probe v3 — focused on remaining offenders (match-cut, text-highlighter, sync-slate).
 * Logs goto failures; reports clipped overflow with drivers (skips scroll-strip + fixed ancestors).
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] || 'http://localhost:3000';
const PAGES = ['/match-cut', '/text-highlighter', '/sync-slate', '/resizer'];

const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
});

for (const path of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    let loadErr = null;
    try {
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise((r) => setTimeout(r, 4000));
        loadErr = await page.evaluate(() => (document.querySelector('.tool-layout-root, .fs-app-root, #__next') ? null : 'no app root; body=' + document.body.innerHTML.slice(0, 80)));
    } catch (e) { loadErr = String(e).slice(0, 150); }

    if (loadErr) { console.log(`\n======== ${path} LOAD FAILED: ${loadErr}`); await page.close(); continue; }

    const info = await page.evaluate(() => {
        const vw = window.innerWidth;
        const bugs = [];
        const ancChain = (el) => {
            let n = el.parentElement;
            while (n && n !== document.body) {
                const cs = getComputedStyle(n);
                if (cs.position === 'fixed') return 'fixed';
                if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return 'scrollstrip';
                if (parseFloat(cs.opacity) === 0 || cs.visibility === 'hidden') return 'invisible';
                n = n.parentElement;
            }
            return null;
        };
        const seen = new Set();
        for (const el of document.querySelectorAll('*')) {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.position === 'fixed') continue;
            const r = el.getBoundingClientRect();
            if (r.right <= vw + 1 || r.width < 40) continue;
            const kind = ancChain(el);
            if (kind === 'scrollstrip' || kind === 'fixed' || kind === 'invisible') continue;
            // keep only leaf-ish offenders to reduce noise
            if (el.childElementCount > 2) continue;
            const k = el.tagName + Math.round(r.left) + Math.round(r.width);
            if (seen.has(k)) continue;
            seen.add(k);
            bugs.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.getAttribute('class') || '').slice(0, 50),
                left: Math.round(r.left), w: Math.round(r.width), over: Math.round(r.right - vw),
                text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50),
                style: (el.getAttribute('style') || '').replace(/\s+/g, ' ').slice(0, 130),
                parentCls: (el.parentElement && el.parentElement.getAttribute('class') || '').slice(0, 50),
            });
        }
        bugs.sort((a, b) => b.over - a.over);
        return bugs.slice(0, 6);
    });

    console.log(`\n======== ${path} ========`);
    for (const b of info) {
        console.log(` <${b.tag} .${b.cls}> parent:.${b.parentCls} left=${b.left} w=${b.w} +${b.over}px`);
        console.log(`   "${b.text}"`);
        console.log(`   style: ${b.style}`);
    }
    if (!info.length) console.log(' ✅ no clipped offenders');
    await page.close();
}

await browser.close();
