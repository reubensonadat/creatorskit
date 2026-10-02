/**
 * Deep probe for the three 320px offenders: /receipt (redirects to /business?tab=receipt),
 * /color-gradient, / (homepage). Dumps offender rect + style + ancestor chain.
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] || 'http://localhost:3000';
const W = 320;

const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
});

for (const path of ['/receipt', '/color-gradient', '/']) {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    try {
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise((r) => setTimeout(r, 4500));
    } catch (e) {
        console.log(`\n======== ${path} LOAD FAILED: ${String(e).slice(0, 150)}`);
        await page.close();
        continue;
    }
    const url = await page.url();

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
        const chain = (el) => {
            const out = [];
            let n = el.parentElement;
            let hops = 0;
            while (n && n !== document.body && hops < 6) {
                const cs = getComputedStyle(n);
                out.push(
                    `${n.tagName.toLowerCase()}.${(n.getAttribute('class') || '').split(/\s+/)[0] || ''} ` +
                    `[w=${Math.round(n.getBoundingClientRect().width)} disp=${cs.display} ` +
                    `grid=${cs.gridTemplateColumns !== 'none' ? cs.gridTemplateColumns : '-'} ` +
                    `flexw=${cs.flexWrap} minw=${cs.minWidth} white=${cs.whiteSpace}]`
                );
                n = n.parentElement;
                hops++;
            }
            return out.join('\n    <- ');
        };
        const seen = new Set();
        for (const el of document.querySelectorAll('*')) {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.position === 'fixed') continue;
            const r = el.getBoundingClientRect();
            if (r.right <= vw + 1 || r.width < 40) continue;
            const kind = ancChain(el);
            if (kind === 'scrollstrip' || kind === 'fixed' || kind === 'invisible') continue;
            if (el.childElementCount > 2) continue;
            const k = el.tagName + Math.round(r.left) + Math.round(r.width);
            if (seen.has(k)) continue;
            seen.add(k);
            bugs.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.getAttribute('class') || '').slice(0, 60),
                left: Math.round(r.left), w: Math.round(r.width), over: Math.round(r.right - vw),
                text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 45),
                style: (el.getAttribute('style') || '').replace(/\s+/g, ' ').slice(0, 160),
                chain: chain(el),
            });
        }
        return bugs.slice(0, 6);
    });

    console.log(`\n======== ${path} (now: ${url}) @ ${W}px — ${info.length} offender(s)`);
    for (const b of info) {
        console.log(`  <${b.tag} .${b.cls}> +${b.over}px w=${b.w} left=${b.left}`);
        console.log(`     text: "${b.text}"`);
        console.log(`     style: ${b.style}`);
        console.log(`     <- ${b.chain}`);
    }
    await page.close();
}

await browser.close();
console.log('\nDONE');
