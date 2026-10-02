import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto('http://localhost:3000/match-cut', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 3500));
const out = await page.evaluate(() => {
    const pick = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { sel, w: Math.round(r.width), right: Math.round(r.right), cssWidth: cs.width, flexWrap: cs.flexWrap, flexDirection: cs.flexDirection, display: cs.display };
    };
    return [
        pick('.tool-transport-bar'),
        pick('.tool-transport-speed'),
        pick('.tool-transport-speed-presets'),
    ];
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
